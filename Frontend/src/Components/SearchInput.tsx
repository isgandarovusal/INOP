import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const { t } = useTranslation();

  const clearSearch = () => {
    onChange("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      clearSearch();
    }
  };

  return (
    <div className="search-field">
      <Search size={15} className="search-field__icon" aria-hidden="true" />
      <input
        type="search"
        aria-label={placeholder ?? t("components.search.placeholder")}
        placeholder={placeholder ?? t("components.search.placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          className="search-field__clear"
          onClick={clearSearch}
          aria-label={t("common.actions.clear")}
          title={t("common.actions.clear")}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
