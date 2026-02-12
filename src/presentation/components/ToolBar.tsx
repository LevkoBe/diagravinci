import { Sun, Moon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../application/store/hooks";
import { toggleTheme } from "../../application/store/themeSlice";
import { useEffect } from "react";

export function ToolBar() {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector((state) => state.theme.isDark);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  const handleToggleTheme = () => dispatch(toggleTheme());

  return (
    <div className="bg-bg-primary border-b-2 border-fg-ternary px-4 py-3 flex items-stretch justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-accent font-semibold">Create</span>
        <div className="flex gap-1">
          <button className="btn-icon" title="Object">
            [ ]
          </button>
          <button className="btn-icon" title="State">
            {"{ }"}
          </button>
          <button className="btn-icon" title="Function">
            ( )
          </button>
          <button className="btn-icon" title="Flow">
            {">>"}
          </button>
          <button className="btn-icon" title="Choice">
            {"< >"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-accent font-semibold">Modes</span>
        <div className="flex gap-1 text-gray-400">
          <button className="btn-icon">+</button>
          <button className="btn-icon">-</button>
          <button className="btn-icon">=</button>
          <button className="btn-icon">≠</button>
          <button className="btn-icon">{">"}</button>
          <button className="btn-icon">$</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-accent font-semibold">Project</span>
        <div className="flex gap-1 text-gray-400">
          <button className="btn-icon">v</button>
          <button className="btn-icon">^</button>
          <button className="btn-icon">x</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-accent font-semibold">Appearance</span>
        <div className="flex gap-1 text-gray-400">
          <button className="btn-icon">+</button>
          <button className="btn-icon">-</button>
          <button className="btn-icon">x</button>
          <button
            onClick={handleToggleTheme}
            className="btn-icon"
            title="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn-icon">{">"}</button>
          <button className="btn-icon">{"<"}</button>
        </div>
      </div>
    </div>
  );
}
