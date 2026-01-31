export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-stretch justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lime-400 font-semibold">Create</span>
          <div className="flex gap-1 text-gray-400">
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"[ ]"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"{ }"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"(  )"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"< >"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {">>"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"<<"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime-400 font-semibold">Modes</span>
          <div className="flex gap-1 text-gray-400">
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"+"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"-"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"="}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"≠"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {">"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"$"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime-400 font-semibold">Project</span>
          <div className="flex gap-1 text-gray-400">
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"v"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"^"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center hover:text-lime-400">
              {"x"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime-400 font-semibold">Appearance</span>
          <div className="flex gap-1 text-gray-400">
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {"+"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {"-"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {"x"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {"*"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {">"}
            </button>
            <button className="w-9 h-9 rounded-full border-2 border-gray-600 hover:border-lime-400 flex items-center justify-center  hover:text-lime-400">
              {"<"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex text-yellow-400">
        <div className="w-80 bg-gray-700 border-r border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-2">
            Code Editor & AI Assistant
          </h2>
        </div>
        <div className="flex-1 bg-gray-800 p-4">
          <h2 className="text-sm font-semibold mb-2">Canvas</h2>
        </div>
        <div className="w-80 bg-gray-700 border-l border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-2">Properties</h2>
        </div>
      </div>
    </div>
  );
}
