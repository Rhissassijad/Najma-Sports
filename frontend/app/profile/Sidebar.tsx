export default function Sidebar() {
  return (
    <div className="w-64 p-6">

      <h2 className="font-bold text-blue-700 mb-4">PLAY</h2>

      <ul className="space-y-2 text-orange-500">
        <li>My Profile</li>
        <li>Find Players</li>
        <li>Book a Venue</li>
      </ul>

      <h2 className="font-bold text-blue-700 mt-8 mb-4">
        PERFORMANCE
      </h2>

      <ul className="text-orange-500">
        <li>Rating History</li>
      </ul>

      <h2 className="font-bold text-blue-700 mt-8 mb-4">
        COMPETITION
      </h2>

      <ul className="space-y-2 text-orange-500">
        <li>Rankings</li>
        <li>Ratings</li>
        <li>Tournaments</li>
      </ul>

    </div>
  );
}