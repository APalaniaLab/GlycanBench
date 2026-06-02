import React from "react";
import GlycanInput from "./GlycanInput";
import NetworkSettings from "./NetworkSettings";
import ActionControls from "./ActionControls";
import SelectedNodeDetails from "./SelectedNodeDetails";
import NetworkStatistics from "./NetworkStatistics";

// TypeScript interfaces
interface ExampleGlycanSet {
  name: string;
  glycans: string;
}

interface SelectedNodeInfo {
  id: string;
  data: any;
}

interface NetworkMetadata {
  [key: string]: any;
}

interface ControlsColumnProps {
  // Props for GlycanInput
  glycansInput: string;
  onGlycansInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  exampleGlycanSets: ExampleGlycanSet[];
  activeExample: number | null;
  onExampleClick: (exampleSet: ExampleGlycanSet, index: number) => void;
  // Props for NetworkSettings
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  permittedRootsInput: string;
  onPermittedRootsInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedEdgeType: string;
  onSelectedEdgeTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableEdgeTypes: string[];
  selectedPTMs: string[];
  onTogglePTM: (ptm: string) => void;
  availablePTMs: string[];
  // Props for ActionControls
  isLoading: boolean;
  onGenerateNetwork: () => void;
  onResetLayout: (fit?: boolean) => void;
  onExportPNG: () => void;
  canPerformActions: boolean;
  // Props for SelectedNodeDetails
  selectedNodeInfo: SelectedNodeInfo | null;
  // Props for NetworkStatistics
  networkMetadata: NetworkMetadata | null;
  // General
  isDarkMode: boolean;
}

const ControlsColumn: React.FC<ControlsColumnProps> = ({
  // Props for GlycanInput
  glycansInput,
  onGlycansInputChange,
  exampleGlycanSets,
  activeExample,
  onExampleClick,
  // Props for NetworkSettings
  showAdvanced,
  onToggleAdvanced,
  permittedRootsInput,
  onPermittedRootsInputChange,
  selectedEdgeType,
  onSelectedEdgeTypeChange,
  availableEdgeTypes,
  selectedPTMs,
  onTogglePTM,
  availablePTMs,
  // Props for ActionControls
  isLoading,
  onGenerateNetwork,
  onResetLayout,
  onExportPNG,
  canPerformActions,
  // Props for SelectedNodeDetails
  selectedNodeInfo,
  // Props for NetworkStatistics
  networkMetadata,
  // General
  isDarkMode,
}) => (
  <aside className="lg:col-span-4 space-y-6">
    <GlycanInput
      glycansInput={glycansInput}
      onInputChange={onGlycansInputChange}
      exampleGlycanSets={exampleGlycanSets}
      activeExample={activeExample}
      onExampleClick={onExampleClick}
      isDarkMode={isDarkMode}
    />
    <NetworkSettings
      showAdvanced={showAdvanced}
      onToggleAdvanced={onToggleAdvanced}
      permittedRootsInput={permittedRootsInput}
      onPermittedRootsInputChange={onPermittedRootsInputChange}
      selectedEdgeType={selectedEdgeType}
      onEdgeTypeChange={onSelectedEdgeTypeChange}
      availableEdgeTypes={availableEdgeTypes}
      selectedPTMs={selectedPTMs}
      onTogglePTM={onTogglePTM}
      availablePTMs={availablePTMs}
      isDarkMode={isDarkMode}
    />
    <ActionControls
      isLoading={isLoading}
      onGenerateNetwork={onGenerateNetwork}
      onResetLayout={onResetLayout}
      onExportPNG={onExportPNG}
      canPerformActions={canPerformActions}
    />
    <SelectedNodeDetails
      selectedNodeInfo={selectedNodeInfo}
      isDarkMode={isDarkMode}
    />
    <NetworkStatistics
      networkMetadata={networkMetadata}
      isDarkMode={isDarkMode}
    />
  </aside>
);

export default ControlsColumn;