import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import InsumosSeccion from '../components/insumos/InsumosSeccion';

export default function Insumos() {
  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <InsumosSeccion />
        </main>
      </div>
    </div>
  );
}
