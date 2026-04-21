import { SettingsPanel } from "@levkobe/c7one";

export function AppSettingsPanel() {
  return (
    <div className="h-full overflow-y-auto bg-bg-base p-4">
      <SettingsPanel
        expose={[
          "mode",
          "colors",
          "--radius",
          "--border-width",
          "--transition-speed",
          "--shadow-intensity",
        ]}
      />
    </div>
  );
}
