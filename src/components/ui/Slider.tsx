import { cn } from '../../lib/utils';

interface SliderProps {
    value: number[];
    min: number;
    max: number;
    step?: number;
    onValueChange: (value: number[]) => void;
    className?: string;
    disabled?: boolean;
}

export function Slider({ value, min, max, step = 1, onValueChange, className, disabled }: SliderProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        onValueChange([parseFloat(e.target.value)]);
    };

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
        <div className={cn("relative w-full h-4 flex items-center", className, disabled && "opacity-50 grayscale pointer-events-none")}>
            <div className="absolute w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-catalog-accent transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={handleChange}
                disabled={disabled}
                className={cn("absolute w-full h-full opacity-0", !disabled && "cursor-pointer")}
            />
            <div
                className="absolute w-3 h-3 bg-white border border-catalog-accent rounded-full shadow-md pointer-events-none transition-all"
                style={{ left: `calc(${percentage}% - 6px)` }}
            />
        </div>
    );
}
