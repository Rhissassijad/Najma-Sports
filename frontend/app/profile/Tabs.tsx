type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export default function ProfileTabs({ activeTab, setActiveTab }: Props) {
  const tabs = ["Overview", "Upcoming", "Stats", "Info"];

  return (
    <div className="bg-gray-200 rounded-lg flex gap-6 px-6 py-3 mt-6">

      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`font-semibold ${
            activeTab === tab ? "text-black" : "text-gray-500"
          }`}
        >
          {tab}
        </button>
      ))}

    </div>
  );
}