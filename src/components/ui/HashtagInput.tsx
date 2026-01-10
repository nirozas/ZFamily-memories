import { useState, type KeyboardEvent } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface HashtagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
}

export function HashtagInput({ tags = [], onChange, placeholder = "Add hashtags...", suggestions = [] }: HashtagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '').toLowerCase();
        if (cleanTag && !tags.includes(cleanTag)) {
            onChange([...tags, cleanTag]);
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const filteredSuggestions = suggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s.toLowerCase())
    );

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 p-2 min-h-[42px] bg-white border border-catalog-accent/20 rounded-lg focus-within:ring-2 focus-within:ring-catalog-accent/30 transition-all">
                {tags.map((tag, index) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-catalog-accent/10 text-catalog-accent text-xs font-medium rounded-md group"
                    >
                        <Tag className="w-3 h-3" />
                        #{tag}
                        <button
                            onClick={() => removeTag(index)}
                            className="p-0.5 hover:bg-catalog-accent/20 rounded text-catalog-accent/50 hover:text-catalog-accent transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[120px] bg-transparent border-none focus:ring-0 text-sm text-catalog-text placeholder:text-catalog-text/40"
                />
            </div>

            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-w-[300px] bg-white border border-catalog-accent/10 rounded-lg shadow-xl overflow-hidden animate-slide-up">
                    {filteredSuggestions.map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => addTag(suggestion)}
                            className="w-full text-left px-4 py-2 text-sm text-catalog-text hover:bg-catalog-stone/10 flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-3 h-3 text-catalog-accent" />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
