import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    suggestions?: string[];
    label?: string;
    placeholder?: string;
}

export function TagInput({
    tags,
    onTagsChange,
    suggestions = [],
    label = 'Tags',
    placeholder = 'Type to add tags...'
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input and exclude already added tags
    const filteredSuggestions = suggestions.filter(suggestion => {
        const lowerSuggestion = suggestion.toLowerCase();
        const lowerInput = inputValue.toLowerCase();
        return (
            lowerInput.length > 0 &&
            lowerSuggestion.includes(lowerInput) &&
            !tags.includes(lowerSuggestion)
        );
    });

    const addTag = (tag: string) => {
        const lowerTag = tag.trim().toLowerCase();
        if (lowerTag && !tags.includes(lowerTag)) {
            onTagsChange([...tags, lowerTag]);
            setInputValue('');
            setShowSuggestions(false);
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setShowSuggestions(value.length > 0);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-2">
            <Label className="text-xs">{label}</Label>

            {/* Tags display */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                        <div
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                        >
                            <span>{tag}</span>
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:bg-primary/20 rounded-sm p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input with autocomplete */}
            <div className="relative">
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="text-xs h-8"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto"
                    >
                        {filteredSuggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => addTag(suggestion)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Press Enter to add a tag, or click a suggestion
            </p>
        </div>
    );
}
