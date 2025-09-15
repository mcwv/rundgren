import { useEffect, useState } from 'react';
import { listPresets, savePreset, loadPreset, deletePreset, exportPresets, importPresets, makeShareLink, tryLoadPresetFromURL } from './simple-presets';

export function useSimplePresets(
  appId: string,
  currentPresetData: () => any,
  applyPreset: (d: any) => void,
  showMessage: (m: string, ms?: number) => void
) {
  const [presets, setPresets] = useState<{ id: string; data: any }[]>([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    const fromURL = tryLoadPresetFromURL();
    if (fromURL) {
      applyPreset(fromURL.data);
      savePreset(appId, fromURL.name, fromURL.data);
      showMessage(`Loaded shared preset: ${fromURL.name}`, 3000);
    } else {
      const def = loadPreset(appId, 'default');
      if (def) {
        applyPreset(def);
        showMessage('Loaded local default preset', 3000);
      }
    }
    setPresets(listPresets(appId));
  }, [appId]);

  return {
    presets,
    setPresets,
    presetName,
    setPresetName,
    save: () => {
      const n = presetName || 'preset';
      savePreset(appId, n, currentPresetData());
      setPresets(listPresets(appId));
      setPresetName('');
      showMessage(`Saved "${n}"`, 2000);
    },
    load: (id: string) => {
      const d = loadPreset(appId, id);
      if (!d) return showMessage('Preset not found', 2000);
      applyPreset(d);
      showMessage(`Loaded "${id}"`, 2000);
    },
    del: (id: string) => {
      deletePreset(appId, id);
      setPresets(listPresets(appId));
      showMessage(`Deleted "${id}"`, 2000);
    },
    exportAll: () => exportPresets(appId),
    importFile: async (file: File) => {
      await importPresets(appId, file);
      setPresets(listPresets(appId));
      showMessage('Presets imported', 2000);
    },
    share: async () => {
      const link = makeShareLink(appId, presetName || 'shared', currentPresetData());
      await navigator.clipboard.writeText(link);
      showMessage('Share link copied', 2000);
    },
  };
}
