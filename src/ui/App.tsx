import { h } from 'preact';
import { TopBar } from './components/TopBar.tsx';
import { Toolbox } from './components/Toolbox.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { CanvasArea } from './components/CanvasArea.tsx';
import { Inspector } from './components/Inspector.tsx';
import { BottomDrawer } from './components/BottomDrawer.tsx';
import { ExportModal } from './components/ExportModal.tsx';

export function App() {
  return (
    <div class="app-container">
      <TopBar />
      <div class="main-workspace">
        <Toolbox />
        <LeftPanel />
        <CanvasArea />
        <Inspector />
      </div>
      <BottomDrawer />
      <ExportModal />
    </div>
  );
}
