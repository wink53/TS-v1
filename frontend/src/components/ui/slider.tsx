import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number[];
    onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
        const currentValue = value?.[0] ?? Number(min);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onValueChange?.([Number(e.target.value)]);
        };

        return (
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={handleChange}
                className={cn(
                    "w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer",
                    "[&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:w-4",
                    "[&::-webkit-slider-thumb]:h-4",
                    "[&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:bg-primary",
                    "[&::-webkit-slider-thumb]:cursor-pointer",
                    "[&::-webkit-slider-thumb]:transition-colors",
                    "[&::-webkit-slider-thumb]:hover:bg-primary/80",
                    "[&::-moz-range-thumb]:w-4",
                    "[&::-moz-range-thumb]:h-4",
                    "[&::-moz-range-thumb]:rounded-full",
                    "[&::-moz-range-thumb]:bg-primary",
                    "[&::-moz-range-thumb]:border-0",
                    "[&::-moz-range-thumb]:cursor-pointer",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
