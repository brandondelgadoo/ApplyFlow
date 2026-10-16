import { APPLICATION_STATUSES } from "@applyflow/shared";

export default function App() {
  return (
    <main>
      <h1>ApplyFlow</h1>
      <p>Statuses from @applyflow/shared:</p>
      <ul>
        {APPLICATION_STATUSES.map((status) => (
          <li key={status}>{status}</li>
        ))}
      </ul>
    </main>
  );
}
