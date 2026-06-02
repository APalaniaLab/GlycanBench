import React from "react";
import { AiOutlineRead, AiOutlineLink } from "react-icons/ai";
import PubMedAI_Search from "./PubMedAI_Search";

// TypeScript interfaces
interface Paper {
  title: string;
  description?: string;
  url: string;
}

const highlightedPapers: Paper[] = [
  {
    title:
      "Deep-Learning Resources for Studying Glycan-Mediated Host-Microbe Interactions",
    description:
      "Introduces deep-learning models trained on 19,299 glycans to predict glycan immunogenicity, pathogenicity, and mimicry. Also presents glycan-alignment methods for motif discovery.",
    url: "https://www.sciencedirect.com/science/article/pii/S193131282030562X",
  },
  {
    title: "SweetOrigins: Extracting Evolutionary Information from Glycans",
    description:
      "Applies deep learning to extract evolutionary signals from glycans across 1,726 species. Constructs glycan-based phylogenetic trees that rival rRNA-based ones.",
    url: "https://www.biorxiv.org/content/10.1101/2020.04.08.031948.full",
  },
  {
    title: "Higher-Order Message Passing for Glycan Representation Learning",
    description:
      "Introduces a novel GNN architecture with higher-order message passing for glycan structure learning. Achieves SOTA performance on GlycanML benchmark.",
    url: "https://arxiv.org/abs/2409.13467",
  },
  {
    title: "GLAMOUR: Graph Learning over Macromolecule Representations",
    description:
      "GLAMOUR is a graph-based deep learning framework for macromolecules, enabling structure-aware predictions and improved interpretability in glycan datasets.",
    url: "https://arxiv.org/abs/2103.02565",
  },
];

const additionalPapers: Paper[] = [
  {
    title:
      "LectinOracle: A Generalizable Deep Learning Model for Lectin-Glycan Binding Prediction",
    url: "https://onlinelibrary.wiley.com/doi/full/10.1002/advs.202103807",
  },
  {
    title:
      "Using Graph Convolutional Neural Networks to Learn a Representation for Glycans",
    url: "https://www.sciencedirect.com/science/article/pii/S2211124721006161",
  },
  {
    title:
      "GlyNet: A Multi-task Neural Network for Predicting Protein–Glycan Interactions",
    url: "https://pubs.rsc.org/en/content/articlelanding/2022/sc/d1sc05681f",
  },
  {
    title:
      "Glycan Immunogenicity Prediction with Efficient Automatic Graph Neural Network",
    url: "https://www.researchgate.net/publication/366814100_Glycan_Immunogenicity_Prediction_with_Efficient_Automatic_Graph_Neural_Network",
  },
  {
    title:
      "A Useful Guide to Lectin Binding: Machine-Learning Directed Annotation of 57 Unique Lectin Specificities",
    url: "https://pubs.acs.org/doi/abs/10.1021/acschembio.1c00689",
  },
  {
    title:
      "Systemic Lectin-Glycan Interaction of Pathogenic Enteric Bacteria in the Gastrointestinal Tract",
    url: "https://pubmed.ncbi.nlm.nih.gov/35163392/",
  },
  {
    title:
      "An Analytical Study on the Identification of N-linked Glycosylation Sites Using Machine Learning Model",
    url: "https://peerj.com/articles/cs-1069/",
  },
  {
    title: "Glycoinformatics in the Artificial Intelligence Era",
    url: "https://pubs.acs.org/doi/10.1021/acs.chemrev.2c00110",
  },
  {
    title: "GNNGLY: Graph Neural Networks for Glycan Classification",
    url: "https://www.researchgate.net/publication/371055705_GNNGLY_Graph_Neural_Networks_for_Glycan_Classification",
  },
];

const ResearchPaperSection: React.FC = () => {
  return (
    <div>
      {/* Added more top padding (pt-20) to this section */}
      <section className="bg-gray-50 pt-20 pb-10 px-6">
        <PubMedAI_Search />
      </section>

      <section className="bg-gradient-to-br from-blue-50 to-white py-12 px-6">
        <h2 className="text-4xl font-extrabold text-blue-800 text-center mb-12">
          <AiOutlineRead className="inline-block mr-2 mb-1" />
          Highlighted Glycan Research Papers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
          {highlightedPapers.map((paper, idx) => (
            <div
              key={idx}
              className="bg-white border-l-8 border-blue-600 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow duration-300"
            >
              <h3 className="text-2xl font-semibold text-blue-700 mb-3">
                {paper.title}
              </h3>
              {paper.description && (
                <p className="text-gray-700 mb-4">{paper.description}</p>
              )}
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition"
              >
                <AiOutlineLink className="mr-2 text-xl" />
                Read Full Paper
              </a>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 mb-12 mt-10">
        <h2 className="text-3xl font-bold text-blue-800 text-center mb-8">
          More Research Papers
        </h2>
        <ul className="list-disc pl-8 space-y-4 text-gray-700 text-lg">
          {additionalPapers.map((paper, idx) => (
            <li key={idx}>
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline flex items-center"
              >
                <AiOutlineLink className="mr-2" />
                {paper.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ResearchPaperSection;