import { Search } from "lucide-react";
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

  return (
    <div className="search-field">
      <Search size={15} className="search-field__icon" />
      <input
        type="text"
        placeholder={placeholder ?? t("components.search.placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchInput;
