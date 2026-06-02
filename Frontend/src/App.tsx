import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import "./utils/testApi"; // Import API tests

import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./Components/Home";

import AboutUs from "./Pages/AboutUs";
import Help from "./Pages/Help";

import GlycanMolecule from "./Pages/Create/GlycanMolecule/GlycanMolecule";
import BiosyntheticNetworks from "./Pages/Create/BiosyntheticNetworks/BiosyntheticNetworks";

import CharacterizeForm from "./Pages/Analyze/CharacterizeForm/CharacterizeForm";
import DescriptorCalculator from "./Pages/Analyze/DescriptorCalculator/DescriptorCalculator";
import GlycanFormatConverter from "./Pages/Analyze/GlycanFormatConverter/GlycanFormatConverter";
import VisualizePage from "./Pages/Analyze/Visualization/VisualizePage";
import GlycanDrawer from "./Pages/Analyze/GlycanDrawer/GlycanDrawer";
import PathwayViewer from "./Pages/Analyze/PathwayViewer/PathwayViewer";
import MotifMutation from "./Pages/Analyze/MotifMutation/MotifMutation";
import CompareGlycans from "./Pages/Analyze/CompareGlycans/CompareGlycans";
import ClusterMultipleGlycans from "./Pages/Analyze/ClusterMultipleGlycans";
import OptimalClusters from "./Pages/Analyze/OptimalClusters";
import DetectOutlierGlycans from "./Pages/Analyze/DetectOutlierGlycans";

import GlycanInsight from "./Pages/Browse/GlycanInsight/GlycanInsight";
import ResearchPapers from "./Pages/Browse/ResearchPapers/ResearchPapers";
import DatasetDownloader from "./Pages/Browse/DatasetDownloader/DatasetDownloader";
import GlycanSearch from "./Pages/Browse/GlycanSearch/GlycanSearch";
import History from "./Pages/Browse/History/History";

import SequenceAlignment from "./Pages/Align/SequenceAlignment/SequenceAlignment";

import Prediction from "./Pages/Predict/Prediction/Prediction";
import GlycomicsChat from "./Pages/Predict/Chat/GlycomicsChat";

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Header />

        {/* Responsive main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/aboutus" element={<AboutUs />} />
            <Route path="/help" element={<Help />} />

            <Route path="/GlycanMolecule" element={<GlycanMolecule />} />
            <Route
              path="/BiosyntheticNetworks"
              element={<BiosyntheticNetworks />}
            />

            <Route path="/characterize" element={<CharacterizeForm />} />
            <Route
              path="/DescriptorCalculator"
              element={<DescriptorCalculator />}
            />
            <Route
              path="/GlycanFormatConverter"
              element={<GlycanFormatConverter />}
            />
            <Route path="/visualize" element={<VisualizePage />} />
            <Route path="/GlycanDrawer" element={<GlycanDrawer />} />
            <Route path="/pathwayMaps" element={<PathwayViewer />} />
            <Route path="/MotifMutation" element={<MotifMutation />} />
            <Route path="/CompareGlycans" element={<CompareGlycans />} />
            <Route path="/cluster/multiple" element={<ClusterMultipleGlycans />} />
            <Route path="/cluster/optimize" element={<OptimalClusters />} />
            <Route path="/cluster/outliers" element={<DetectOutlierGlycans />} />

            <Route path="/GlycanInsight" element={<GlycanInsight />} />
            <Route path="/researchPapers" element={<ResearchPapers />} />
            <Route path="/DatasetDownloader" element={<DatasetDownloader />} />
            <Route path="/PDBsearch" element={<GlycanSearch />} />
            <Route path="/history" element={<History />} />

            <Route
              path="/sequenceAlignment"
              element={<SequenceAlignment />}
            />

            <Route path="/prediction" element={<Prediction />} />
            <Route path="/GlycomicsChat" element={<GlycomicsChat />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;