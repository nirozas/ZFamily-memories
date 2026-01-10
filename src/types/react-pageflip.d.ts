declare module 'react-pageflip' {
    import React from 'react';

    export interface HTMLFlipBookProps {
        width: number;
        height: number;
        size?: 'fixed' | 'stretch';
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
        drawShadow?: boolean;
        flippingTime?: number;
        usePortrait?: boolean;
        startZIndex?: number;
        autoSize?: boolean;
        maxShadowOpacity?: number;
        showCover?: boolean;
        mobileScrollSupport?: boolean;
        clickEventForward?: boolean;
        useMouseEvents?: boolean;
        swipeDistance?: number;
        showPageCorners?: boolean;
        disableFlipByClick?: boolean;
        style?: React.CSSProperties;
        className?: string;
        ref?: any;
        children: React.ReactNode;
        onFlip?: (e: { data: number }) => void;
        onChangeOrientation?: (e: { data: 'portrait' | 'landscape' }) => void;
        onChangeState?: (e: { data: 'user_fold' | 'fold_corner' | 'flipping' | 'read' }) => void;
    }

    export default class HTMLFlipBook extends React.Component<HTMLFlipBookProps> {
        pageFlip(): {
            flipNext(corner?: 'top' | 'bottom'): void;
            flipPrev(corner?: 'top' | 'bottom'): void;
            turnToPage(pageIndex: number): void;
            flip(pageIndex: number, corner?: 'top' | 'bottom'): void;
            loadFromImages(images: string[]): void;
            updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
            destroy(): void;
            getPageCount(): number;
            getCurrentPageIndex(): number;
            getOrientation(): 'portrait' | 'landscape';
        };
    }
}
