import { h } from 'preact';
import { TopBar } from './components/TopBar.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { CanvasArea } from './components/CanvasArea.tsx';
import { Inspector } from './components/Inspector.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { AddModuleModal } from './dialogs/AddModuleModal.tsx';

export function App() {
  return (
    <div class="app-container">
      <TopBar />
      <div class="main-workspace">
        <LeftPanel />
        <CanvasArea />
        <Inspector />
      </div>
      <StatusBar />
      <ExportModal />
      <AddModuleModal />
    </div>
  );
}
