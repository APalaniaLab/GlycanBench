import React, { useState, useEffect, useCallback, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { BASE_URL } from "../../../utils/const";

// ========== Types ==========
interface ExamplePathway {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  name: string;
}

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const PathwayViewer: React.FC = () => {
  const [pathwayIdInput, setPathwayIdInput] = useState<string>("");
  const [pathwayToLoad, setPathwayToLoad] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [actualKeggIdUsed, setActualKeggIdUsed] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [searchTermForApi, setSearchTermForApi] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLDivElement>(null);

  const examplePathways: ExamplePathway[] = [
    { id: "map00510", name: "N-Glycan biosynthesis" },
    { id: "map00512", name: "O-Glycan biosynthesis" },
    { id: "map00534", name: "Glycosaminoglycan biosynthesis - heparan sulfate / heparin" },
    { id: "map00604", name: "Glycosphingolipid biosynthesis - ganglio series" },
    { id: "map00514", name: "Other types of O-glycan biosynthesis" },
    { id: "map00533", name: "Keratan sulfate biosynthesis" },
    { id: "map00601", name: "Glycosphingolipid biosynthesis - lacto and neolacto series" },
    { id: "map00511", name: "Glycan degradation" },
    { id: "map00540", name: "Lipopolysaccharide biosynthesis" },
    { id: "map01110", name: "Biosynthesis of secondary metabolites (glyco-conjugates)" },
  ];

  const fetchPathwayData = async (idToFetch: string) => {
    if (!idToFetch) {
      setError("Please enter or select a KEGG Pathway ID to load.");
      return;
    }
    setIsLoading(true);
    setImageUrl("");
    setError("");
    setWarning("");
    setActualKeggIdUsed("");

    try {
      const queryParams = new URLSearchParams({ kegg_id: idToFetch });
      const res = await fetch(`${BASE_URL}/api/pathway?${queryParams.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setImageUrl(data.img_url);
        setActualKeggIdUsed(data.kegg_id_used || idToFetch);
        if (data.warning) setWarning(data.warning);
      } else {
        setError(data.error || "Failed to load pathway. Unknown error.");
      }
    } catch (err) {
      setError("Failed to connect to the server or parse response.");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPathway = () => {
    if (!pathwayToLoad.trim()) {
      setError("No valid KEGG Pathway ID. Please enter or select one.");
      return;
    }
    fetchPathwayData(pathwayToLoad);
  };

  const handleExampleClick = (exampleId: string, exampleName: string) => {
    setPathwayIdInput(`${exampleName} (${exampleId})`);
    setPathwayToLoad(exampleId);
    setSearchTermForApi("");
    setSearchResults([]);
    setShowSearchDropdown(false);
    setError("");
    setWarning("");
  };

  const debouncedSearchApi = useCallback(
    debounce(async (currentSearchTerm) => {
      if (currentSearchTerm.length < 3) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`${BASE_URL}/api/search_pathways?query=${encodeURIComponent(currentSearchTerm)}`);
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data);
          setShowSearchDropdown(data.length > 0);
        } else {
          setSearchResults([]);
          setShowSearchDropdown(false);
        }
      } catch (err) {
        console.warn("Search error:", err);
        setSearchResults([]);
        setShowSearchDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (searchTermForApi.trim() !== "") {
      debouncedSearchApi(searchTermForApi);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchTermForApi, debouncedSearchApi]);

  const handlePathwayIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPathwayIdInput(value);
    setSearchTermForApi(value);

    if (value.match(/^[a-zA-Z]{2,4}\d{5}$|^map\d{5}$|^\d{5}$/i)) {
      setPathwayToLoad(value.trim());
    } else {
      if (pathwayToLoad && !value.toLowerCase().includes(pathwayToLoad.toLowerCase())) {
        setPathwayToLoad("");
      } else if (!pathwayToLoad && value.trim() === "") {
        setPathwayToLoad("");
      }
    }
  };

  const handleSearchDropdownItemClick = (path: SearchResult) => {
    setPathwayIdInput(`${path.name} (${path.id})`);
    setPathwayToLoad(path.id);
    setSearchTermForApi(path.id);
    setShowSearchDropdown(false);
    setSearchResults([]);
    setError("");
    setWarning("");
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Image download handler
  const handleDownloadImage = async () => {
    if (!imageUrl) {
      alert("No image loaded to download.");
      return;
    }
    
    setIsDownloading(true);
    
    try {
      const proxyUrl = `${BASE_URL}/api/proxy_image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use the status text
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const filename = actualKeggIdUsed ? `${actualKeggIdUsed}.png` : "kegg_pathway.png";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      

      
    } catch (error) {
      console.error("Error downloading image:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Fallback: try to open the image in a new tab
      const fallbackConfirm = confirm(
        `Download failed: ${errorMessage}\n\nWould you like to open the image in a new tab instead? You can then right-click and save it manually.`
      );
      
      if (fallbackConfirm) {
        window.open(imageUrl, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans antialiased text-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-700">
          KEGG Pathway Viewer
        </h1>
        <p className="text-md text-gray-600 mt-1">
          Explore KEGG pathways.
        </p>
      </header>

      <div className="bg-white shadow-xl rounded-lg p-6 mb-6">
        <div className="mb-4">
          <div className="relative pb-6" ref={searchInputRef}>
            <label htmlFor="pathwaySearchInput" className="block text-sm font-medium text-gray-700 mb-1">
              Search Pathway Name or Enter ID:
            </label>
            <input
              id="pathwaySearchInput"
              type="text"
              value={pathwayIdInput}
              onChange={handlePathwayIdInputChange}
              onFocus={() =>
                pathwayIdInput && searchResults.length > 0 && setShowSearchDropdown(true)
              }
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 'glycolysis' or 'map00010'"
              autoComplete="off"
            />
            {isSearching && (
              <p className="text-xs text-gray-500 mt-1 absolute bottom-0 left-0">
                Searching...
              </p>
            )}
            {showSearchDropdown && searchResults.length > 0 && (
              <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                {searchResults.map((path) => (
                  <li
                    key={path.id}
                    onClick={() => handleSearchDropdownItemClick(path)}
                    className="p-3 hover:bg-blue-100 cursor-pointer text-sm"
                  >
                    {path.name} <span className="text-gray-500">({path.id})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          onClick={handleLoadPathway}
          disabled={isLoading || !pathwayToLoad.trim()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 text-lg font-semibold"
        >
          {isLoading ? "Loading..." : "Load Pathway"}
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Example Pathways:</h3>
        <div className="flex flex-wrap gap-2">
          {examplePathways.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleExampleClick(ex.id, ex.name)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                pathwayToLoad === ex.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {ex.name.length > 40 ? ex.id : ex.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-700 bg-red-100 border border-red-500 p-3 rounded-md text-center mb-4 shadow">{error}</p>}
      {warning && !error && <p className="text-yellow-800 bg-yellow-100 border border-yellow-500 p-3 rounded-md text-center mb-4 shadow">{warning}</p>}

      {isLoading && !imageUrl && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      )}

      {imageUrl && !isLoading ? (
        <div className="border border-gray-300 p-1 rounded-lg shadow-xl overflow-hidden bg-gray-50">
          <TransformWrapper
            key={imageUrl}
            initialScale={1}
            minScale={0.1}
            maxScale={10}
            centerOnInit={true}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="text-sm text-gray-700 p-3 bg-gray-100 border-b border-gray-300 flex justify-between items-center flex-wrap gap-2">
                  <span>
                    Displaying pathway:{" "}
                    <strong className="text-black">{actualKeggIdUsed}</strong>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => zoomIn(0.2)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      +
                    </button>
                    <button
                      onClick={() => zoomOut(0.2)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      -
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleDownloadImage}
                      disabled={!imageUrl || isDownloading}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                    >
                      {isDownloading ? "Downloading..." : "Download"}
                    </button>
                  </div>
                </div>
                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    maxHeight: "calc(100vh - 300px)",
                    minHeight: "400px",
                    cursor: "grab",
                    backgroundColor: "#fff",
                  }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  <img
                    src={imageUrl}
                    alt={`KEGG Pathway ${actualKeggIdUsed}`}
                    className="max-w-none w-auto h-auto mx-auto block"
                    onError={() =>
                      setError(
                        `Failed to load image from URL for ${actualKeggIdUsed}.`
                      )
                    }
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      ) : (
        !error &&
        !isLoading &&
        !warning && (
          <p className="text-gray-500 text-center py-10 text-lg">
            No pathway loaded. Enter an ID or search, then click "Load Pathway".
          </p>
        )
      )}

      <footer className="text-center mt-12 py-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Pathway data and images from{" "}
          <a
            href="https://www.kegg.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            KEGG: Kyoto Encyclopedia of Genes and Genomes
          </a>
          .
        </p>
      </footer>
    </div>
  );
};

export default PathwayViewer;
