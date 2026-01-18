
// Layout configuration types
interface LayoutFrame {
    left: number;
    top: number;
    width: number;
    height: number;
    rotation?: number;
    z_index: number;
}

export interface AlbumLayout {
    id: string;
    name: string;
    category: string;
    image_count: number;
    aspect_ratio: string;
    dimension_type: string;
    is_spread: boolean;
    backgroundImage?: string;
    config: LayoutFrame[];
}

export const PROFESSIONAL_LAYOUTS: AlbumLayout[] = [
    { id: 'pro-1-1', name: 'Grid 1-1', category: 'Symmetric', image_count: 1, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 0, "top": 0, "width": 100, "height": 100, "rotation": 0, "z_index": 0 }] },
    { id: 'pro-1-2', name: 'Artistic 1-6', category: 'Negative Space', image_count: 1, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 7.31, "top": 7.31, "width": 66.76, "height": 66.76, "rotation": 0, "z_index": 0 }] },
    { id: 'pro-1-3', name: 'Collage 1-7', category: 'Asymmetric', image_count: 1, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 1.4, "top": 1.4, "width": 97.19, "height": 97.19, "rotation": 0, "z_index": 0 }] },
    { id: 'pro-2-1', name: 'Grid 2-1', category: 'Symmetric', image_count: 2, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 0, "top": 0, "width": 50, "height": 100, "rotation": 0, "z_index": 0 }, { "left": 50, "top": 0, "width": 50, "height": 100, "rotation": 0, "z_index": 1 }] },
    { id: 'pro-2-2', name: 'Collage 2-6', category: 'Asymmetric', image_count: 2, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 1.24, "top": 1.24, "width": 97.52, "height": 29.15, "rotation": 0, "z_index": 0 }, { "left": 1.24, "top": 32.86, "width": 97.52, "height": 65.9, "rotation": 0, "z_index": 1 }] },
    { id: 'pro-3-1', name: 'Grid 3-1', category: 'Symmetric', image_count: 3, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 0, "top": 0, "width": 50, "height": 50, "rotation": 0, "z_index": 0 }, { "left": 50, "top": 0, "width": 50, "height": 50, "rotation": 0, "z_index": 1 }, { "left": 0, "top": 50, "width": 50, "height": 50, "rotation": 0, "z_index": 2 }] },
    { id: 'pro-3-2', name: 'Artistic 3-7', category: 'Negative Space', image_count: 3, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 6.46, "top": 57.09, "width": 67.96, "height": 32.52, "rotation": 0, "z_index": 0 }, { "left": 1.46, "top": 1.46, "width": 43.19, "height": 47.72, "rotation": 0, "z_index": 1 }, { "left": 47.56, "top": 1.46, "width": 50.99, "height": 47.72, "rotation": 0, "z_index": 2 }] },
    { id: 'pro-4-1', name: 'Grid 4-1', category: 'Symmetric', image_count: 4, aspect_ratio: '3:2', dimension_type: 'A4_LANDSCAPE', is_spread: false, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 0, "top": 0, "width": 50, "height": 50, "rotation": 0, "z_index": 0 }, { "left": 50, "top": 0, "width": 50, "height": 50, "rotation": 0, "z_index": 1 }, { "left": 0, "top": 50, "width": 50, "height": 50, "rotation": 0, "z_index": 2 }, { "left": 50, "top": 50, "width": 50, "height": 50, "rotation": 0, "z_index": 3 }] },
    { id: 'pro-spread-1', name: 'Spread Story 5-1', category: 'Asymmetric', image_count: 5, aspect_ratio: '3:1', dimension_type: 'A4_LANDSCAPE', is_spread: true, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 88.43, "top": 1.37, "width": 110.2, "height": 48.25, "rotation": 0, "z_index": 0 }, { "left": 88.43, "top": 52.36, "width": 110.2, "height": 46.28, "rotation": 0, "z_index": 1 }, { "left": 1.37, "top": 1.37, "width": 84.33, "height": 27.86, "rotation": 0, "z_index": 2 }, { "left": 1.37, "top": 31.96, "width": 84.33, "height": 29.94, "rotation": 0, "z_index": 3 }, { "left": 1.37, "top": 64.64, "width": 84.33, "height": 33.99, "rotation": 0, "z_index": 4 }] },
    { id: 'pro-spread-2', name: 'Spread Story 8-2', category: 'Asymmetric', image_count: 8, aspect_ratio: '3:1', dimension_type: 'A4_LANDSCAPE', is_spread: true, backgroundImage: 'https://res.cloudinary.com/dhdarmxup/image/upload/v1/paper_texture_a4_landscape_1768620681016.png', config: [{ "left": 70.59, "top": 39.19, "width": 55.44, "height": 59.43, "rotation": 0, "z_index": 0 }, { "left": 128.8, "top": 66.04, "width": 69.82, "height": 32.58, "rotation": 0, "z_index": 1 }, { "left": 1.38, "top": 1.38, "width": 63.39, "height": 35.04, "rotation": 0, "z_index": 2 }, { "left": 128.8, "top": 33.03, "width": 69.82, "height": 30.24, "rotation": 0, "z_index": 3 }, { "left": 67.54, "top": 1.38, "width": 58.5, "height": 35.04, "rotation": 0, "z_index": 4 }, { "left": 128.8, "top": 1.38, "width": 69.82, "height": 28.88, "rotation": 0, "z_index": 5 }, { "left": 1.38, "top": 39.19, "width": 66.44, "height": 19.12, "rotation": 0, "z_index": 6 }, { "left": 1.38, "top": 61.07, "width": 66.44, "height": 37.54, "rotation": 0, "z_index": 7 }] }
];
