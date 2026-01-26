import { generateId } from './utils';
import { type Page, type LayoutBox, type PageStyles, type Asset } from '../contexts/AlbumContext';

/**
 * Normalizes raw database page records into strictly typed AlbumPageData.
 * Implements Fallback-to-Legacy and Progressive-Enhancement patterns.
 */
export function normalizePageData(p: any): Page {
    // --- INDESTRUCTIBLE SAFE PARSE ENGINE ---
    const safeParse = (data: any, fallback: any = []) => {
        if (!data) return fallback;
        if (typeof data === 'object') return data;
        if (typeof data === 'string' && (data === 'null' || data === 'undefined')) return fallback;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('[Normalization] Logic Failure: Malformed JSON detected.', { error: e, data });
            return fallback;
        }
    };

    // 1. Identify schema format - MULTI-STAGE DISCOVERY
    // We check each column and pick the first one that yields a non-empty array.
    const configData = safeParse(p.layout_config, null);
    const jsonData = safeParse(p.layout_json, null);
    const contentData = safeParse(p.content, null);

    let layoutArray = (configData && Array.isArray(configData) && configData.length > 0) ? configData
        : (jsonData && Array.isArray(jsonData) && jsonData.length > 0) ? jsonData
            : (contentData && Array.isArray(contentData) && contentData.length > 0) ? contentData
                : (configData || jsonData || contentData || []); // Final fallback to whatever exists

    const rawAreaText = p.text_layers || [];
    const textArray = safeParse(rawAreaText);

    // [DIAGNOSTIC] Log hydration source for the 26-page album mystery
    if (p.page_number === 1) {
        console.log(`[Hydration] Page 1 Sources: config=${!!p.layout_config}, json=${!!p.layout_json}, assets=${p.assets?.length || 0}`);
        console.log(`[Hydration] Selected Layout Items: ${layoutArray.length}`, layoutArray[0]);
    }

    const isUnified = Array.isArray(layoutArray) && (layoutArray.length > 0 || !!p.layout_config || !!p.layout_json);

    if (isUnified) {
        // --- NEW UNIFIED SCHEMA (v5.0) ---
        // Fallback: If layoutArray is empty but assets exist, convert assets to layout boxes
        let finalLayoutArray = [...layoutArray];
        if (finalLayoutArray.length === 0 && p.assets && p.assets.length > 0) {
            console.warn(`[Normalization] Unified layout empty for page ${p.page_number}, falling back to assets column.`);
            finalLayoutArray = p.assets.map((a: any) => ({
                id: a.id,
                role: 'freeform',
                left: a.x || 0,
                top: a.y || 0,
                width: a.width || 30,
                height: a.height || 30,
                zIndex: a.z_index || 10,
                content: {
                    type: a.asset_type || a.type || 'image',
                    url: a.url,
                    config: a.config || {}
                }
            }));
        }

        const allItems = [...finalLayoutArray, ...textArray];

        const layoutConfig: LayoutBox[] = allItems
            .filter((item: any) => item && item.role !== 'text')
            .map((frame: any) => ({
                id: frame.id || generateId(),
                role: frame.role || 'slot',
                left: Number(frame.left ?? frame.x ?? 0),
                top: Number(frame.top ?? frame.y ?? 0),
                width: Number(frame.width ?? 30),
                height: Number(frame.height ?? 30),
                zIndex: Number(frame.zIndex ?? frame.z ?? 10),
                content: {
                    type: frame.content?.type || frame.type || 'image',
                    url: frame.content?.url || frame.url || null,
                    zoom: Number(frame.content?.zoom ?? frame.zoom ?? 1),
                    x: Number(frame.content?.x ?? frame.focalX ?? 50),
                    y: Number(frame.content?.y ?? frame.focalY ?? 50),
                    rotation: Number(frame.content?.rotation ?? frame.rotation ?? 0),
                    text: frame.content?.text || frame.content?.config?.content || frame.content || null,
                    config: frame.content?.config || frame.config || {}
                }
            }));

        const textLayers: LayoutBox[] = allItems
            .filter((item: any) => item && (item.role === 'text' || item.type === 'text'))
            .map((frame: any) => ({
                id: frame.id || generateId(),
                role: 'text',
                left: Number(frame.left ?? frame.x ?? 0),
                top: Number(frame.top ?? frame.y ?? 0),
                width: Number(frame.width ?? 50),
                height: Number(frame.height ?? 10),
                zIndex: Number(frame.zIndex ?? frame.z ?? 50),
                content: {
                    type: 'text',
                    url: undefined,
                    zoom: 1,
                    x: 50,
                    y: 50,
                    rotation: Number(frame.content?.rotation || frame.rotation || 0),
                    text: frame.content?.text || frame.content?.config?.content || frame.content || 'Double click to edit',
                    config: frame.content?.config || frame.config || {}
                }
            }));

        const pageStyles: PageStyles = {
            backgroundColor: p.page_styles?.backgroundColor || p.background_config?.color || p.background_color || '#ffffff',
            backgroundOpacity: Number(p.page_styles?.backgroundOpacity ?? p.background_config?.opacity ?? p.background_opacity ?? 100),
            backgroundImage: p.page_styles?.backgroundImage || p.background_config?.image || p.background_image || undefined,
            backgroundBlendMode: p.page_styles?.backgroundBlendMode || p.background_config?.blendMode || 'normal'
        };

        return {
            id: p.id || `page-${p.page_number}`,
            pageNumber: p.page_number,
            layoutTemplate: p.layout_template || p.template_id || 'freeform',
            layoutConfig,
            textLayers,
            pageStyles,
            backgroundColor: pageStyles.backgroundColor,
            backgroundOpacity: pageStyles.backgroundOpacity,
            backgroundImage: pageStyles.backgroundImage,
            assets: []
        };
    } else {
        // --- LEGACY SCHEMA (v1.0 - v4.0) ---
        const assets: Asset[] = (p.assets || []).map((a: any) => {
            let restoredType = a.asset_type;
            if (a.config?.originalType) {
                restoredType = a.config.originalType;
            } else if (a.asset_type === 'image' && a.config?.mapConfig) {
                restoredType = 'map';
            } else if (a.asset_type === 'text' && (a.config?.location || a.config?.isLocation)) {
                restoredType = 'location';
            }

            return {
                id: a.id,
                type: restoredType,
                url: a.url,
                zIndex: a.z_index || 0,
                slotId: a.slot_id,
                ...(a.config || {})
            };
        });

        return {
            id: p.id,
            pageNumber: p.page_number,
            layoutTemplate: p.template_id || 'freeform',
            backgroundColor: p.background_color || '#ffffff',
            backgroundOpacity: p.background_opacity ?? 100,
            backgroundImage: p.background_image,
            assets: assets,
            layoutConfig: [],
            textLayers: []
        };
    }
}
