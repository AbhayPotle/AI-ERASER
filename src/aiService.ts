// @ts-nocheck
import * as bodyPix from '@tensorflow-models/body-pix';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';
import Tesseract from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';

// Types
export interface BlurOptions {
    faces: boolean;
    body: boolean;
    licensePlate: boolean;
    sensitiveText: boolean;
    strength: number;
}

interface FaceBox {
    x: number;
    y: number;
    width: number;
    height: number;
    source: string;
    score: number;
}

let bodyPixModel: bodyPix.BodyPix | null = null;
let cocoModel: cocoSsd.ObjectDetection | null = null;
let blazeModel: blazeface.BlazeFaceModel | null = null;

export const loadModels = async (onProgress: (msg: string) => void) => {
    try {
        onProgress("Loading Face Detection Model...");
        blazeModel = await blazeface.load();

        onProgress("Loading Object Detection Model...");
        cocoModel = await cocoSsd.load();

        onProgress("Loading Body Segmentation Model...");
        bodyPixModel = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });

        onProgress("All Models Loaded ✓");
        return true;
    } catch (error) {
        console.error("Error loading models:", error);
        onProgress("Error loading models. Check console.");
        return false;
    }
};

// ─── Helpers ───

/** Compute Intersection over Union of two boxes */
const computeIoU = (a: FaceBox, b: FaceBox): number => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersection === 0) return 0;
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return intersection / (areaA + areaB - intersection);
};

/** Merge overlapping boxes via IoU */
const deduplicateBoxes = (boxes: FaceBox[], iouThreshold = 0.3): FaceBox[] => {
    if (boxes.length === 0) return [];
    const sorted = [...boxes].sort((a, b) => b.score - a.score);
    const keep: FaceBox[] = [];

    for (const box of sorted) {
        let isDuplicate = false;
        for (const kept of keep) {
            if (computeIoU(box, kept) > iouThreshold) {
                isDuplicate = true;
                // Expand the kept box to encompass both
                const x1 = Math.min(kept.x, box.x);
                const y1 = Math.min(kept.y, box.y);
                const x2 = Math.max(kept.x + kept.width, box.x + box.width);
                const y2 = Math.max(kept.y + kept.height, box.y + box.height);
                kept.x = x1;
                kept.y = y1;
                kept.width = x2 - x1;
                kept.height = y2 - y1;
                break;
            }
        }
        if (!isDuplicate) keep.push({ ...box });
    }
    return keep;
};

/**
 * Multi-scale BlazeFace detection.
 * BlazeFace works best on ~128x128 input. For large images with small faces,
 * we tile the image into overlapping crops and detect faces in each crop,
 * then map coordinates back to the original image space.
 */
const detectWithBlazeFaceMultiScale = async (img: HTMLImageElement): Promise<FaceBox[]> => {
    if (!blazeModel) return [];
    const allBoxes: FaceBox[] = [];

    try {
        // Pass 1: Full image (catches large/medium faces)
        const preds1 = await blazeModel.estimateFaces(img, false);
        for (const pred of preds1 as any[]) {
            const start = pred.topLeft as number[];
            const end = pred.bottomRight as number[];
            allBoxes.push({
                x: start[0], y: start[1],
                width: end[0] - start[0], height: end[1] - start[1],
                source: 'blaze-full', score: pred.probability?.[0] ?? 0.9
            });
        }

        // Pass 2: If image is large, scan overlapping tiles to catch smaller faces
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        if (imgW > 400 || imgH > 400) {
            // Create tiles with 50% overlap
            const tileSize = Math.min(imgW, imgH, 640);
            const stepSize = Math.floor(tileSize * 0.5);
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
                for (let y = 0; y < imgH; y += stepSize) {
                    for (let x = 0; x < imgW; x += stepSize) {
                        const cropW = Math.min(tileSize, imgW - x);
                        const cropH = Math.min(tileSize, imgH - y);

                        // Skip very small remaining tiles
                        if (cropW < 100 || cropH < 100) continue;

                        tempCanvas.width = cropW;
                        tempCanvas.height = cropH;
                        tempCtx.drawImage(img, x, y, cropW, cropH, 0, 0, cropW, cropH);

                        const preds = await blazeModel.estimateFaces(tempCanvas, false);
                        for (const pred of preds as any[]) {
                            const start = pred.topLeft as number[];
                            const end = pred.bottomRight as number[];
                            // Map back to original image coordinates
                            allBoxes.push({
                                x: start[0] + x,
                                y: start[1] + y,
                                width: end[0] - start[0],
                                height: end[1] - start[1],
                                source: 'blaze-tile',
                                score: pred.probability?.[0] ?? 0.8
                            });
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("BlazeFace multi-scale error:", err);
    }

    return allBoxes;
};

/** Estimate head regions from COCO-SSD person detections */
const detectHeadsFromPersons = async (img: HTMLImageElement): Promise<FaceBox[]> => {
    if (!cocoModel) return [];
    try {
        const predictions = await cocoModel.detect(img);
        return predictions
            .filter((p: any) => p.class === 'person' && p.score > 0.35)
            .map((p: any) => {
                const [x, y, w, h] = p.bbox;
                // Head is roughly the top 25% of the person bbox, centered
                const headHeight = h * 0.25;
                const headWidth = w * 0.45;
                const headX = x + (w - headWidth) / 2;
                return {
                    x: headX, y: y,
                    width: headWidth, height: headHeight,
                    source: 'coco-head', score: p.score
                };
            });
    } catch (err) {
        console.error("COCO-SSD person detection error:", err);
        return [];
    }
};

// ─── Main Processing ───

export const processImage = async (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    options: BlurOptions
) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const blurAmount = options.strength || 20;

    const applyBlurToRect = (x: number, y: number, w: number, h: number) => {
        if (w <= 0 || h <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
    };

    // ─── A. Body Parts (Segmentation) ───
    if (options.body && bodyPixModel) {
        try {
            const segmentation = await bodyPixModel.segmentPerson(img, {
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');

            if (maskCtx) {
                const imgData = maskCtx.createImageData(canvas.width, canvas.height);
                const data = segmentation.data;
                for (let i = 0; i < data.length; i++) {
                    if (data[i] === 1) {
                        imgData.data[i * 4] = 255;
                        imgData.data[i * 4 + 1] = 255;
                        imgData.data[i * 4 + 2] = 255;
                        imgData.data[i * 4 + 3] = 255;
                    } else {
                        imgData.data[i * 4 + 3] = 0;
                    }
                }
                maskCtx.putImageData(imgData, 0, 0);

                const blurredCanvas = document.createElement('canvas');
                blurredCanvas.width = canvas.width;
                blurredCanvas.height = canvas.height;
                const bCtx = blurredCanvas.getContext('2d');
                if (bCtx) {
                    bCtx.filter = `blur(${blurAmount}px)`;
                    bCtx.drawImage(img, 0, 0);
                    bCtx.globalCompositeOperation = 'destination-in';
                    bCtx.drawImage(maskCanvas, 0, 0);
                    ctx.drawImage(blurredCanvas, 0, 0);
                }
            }
        } catch (err) {
            console.error("Body segmentation error:", err);
        }
    }

    // ─── B. Multi-Strategy Face Detection ───
    if (options.faces) {
        // Run BlazeFace multi-scale + COCO-SSD head estimation in parallel
        const [blazeBoxes, cocoHeadBoxes] = await Promise.all([
            detectWithBlazeFaceMultiScale(img),
            detectHeadsFromPersons(img)
        ]);

        const allBoxes = [...blazeBoxes, ...cocoHeadBoxes];
        console.log(`Face detection: blazeface=${blazeBoxes.length}, coco-head=${cocoHeadBoxes.length}, total=${allBoxes.length}`);

        // De-duplicate overlapping boxes
        const uniqueBoxes = deduplicateBoxes(allBoxes, 0.3);
        console.log(`After de-duplication: ${uniqueBoxes.length} unique face regions`);

        // Apply blur with 20% padding
        uniqueBoxes.forEach(box => {
            const padX = box.width * 0.2;
            const padY = box.height * 0.2;
            applyBlurToRect(
                box.x - padX, box.y - padY,
                box.width + padX * 2, box.height + padY * 2
            );
        });
    }

    // ─── C. License Plates / Sensitive Text ───
    if (options.licensePlate || options.sensitiveText) {
        try {
            const { data } = await Tesseract.recognize(img, 'eng');
            const words = (data as any).words || [];
            words.forEach((word: any) => {
                const text = word.text;
                const bbox = word.bbox;
                const w = bbox.x1 - bbox.x0;
                const h = bbox.y1 - bbox.y0;
                let shouldBlur = false;
                if (options.sensitiveText) {
                    if (/\S+@\S+\.\S+/.test(text)) shouldBlur = true;
                    if (/\d{3}[-.\s]?\d{4}/.test(text)) shouldBlur = true;
                }
                if (options.licensePlate) {
                    if (/^[A-Z0-9]{4,9}$/.test(text.toUpperCase())) shouldBlur = true;
                }
                if (shouldBlur) applyBlurToRect(bbox.x0, bbox.y0, w, h);
            });
        } catch (err) {
            console.error("OCR Error:", err);
        }
    }
};
