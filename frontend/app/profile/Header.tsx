type Props = {
  user: any;
};

export default function ProfileHeader({ user }: Props) {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 flex items-center justify-between">

      {/* LEFT */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-black"></div>

        <div>
          <h1 className="text-xl font-bold">
            {user.name || "No Name"}
          </h1>
        </div>
      </div>

      {/* RIGHT STATS */}
      <div className="grid grid-cols-4 gap-6 text-center text-sm">

        <div>
          <p className="text-gray-500">Singles</p>
          <p className="font-bold text-lg">42.8</p>
          <p className="text-green-500">+1.2</p>
        </div>

        <div>
          <p className="text-gray-500">Doubles</p>
          <p className="font-bold text-lg">43.8</p>
          <p className="text-green-500">+0.8</p>
        </div>

        <div>
          <p className="text-gray-500">Regional</p>
          <p className="font-bold text-lg">156</p>
          <p className="text-green-500">+5</p>
        </div>

        <div>
          <p className="text-gray-500">Global</p>
          <p className="font-bold text-lg">2546</p>
          <p className="text-red-500">-4</p>
        </div>

      </div>
    </div>
  );
}