import { Plus } from 'lucide-react';

const FabButton = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-5 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-soft transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 sm:right-8"
      aria-label="Add expense"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};

export default FabButton;
