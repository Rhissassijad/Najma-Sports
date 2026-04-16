type Props = {
  title: string;
  player1: string;
  player2: string;
  score: string;
};

export default function MatchCard({ title, player1, player2, score }: Props) {
  return (
    <div className="bg-[#F59E0B] text-blue-900 rounded-xl p-6 mt-6">

      <h2 className="font-bold mb-4">
        {title}
      </h2>

      <div className="flex justify-between font-semibold">
        <span>{player1}</span>
        <span>{score}</span>
      </div>

      <div className="flex justify-between mt-2">
        <span>{player2}</span>
      </div>

    </div>
  );
}