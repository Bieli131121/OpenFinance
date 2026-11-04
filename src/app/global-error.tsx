'use client';

// Último recurso: erro no próprio layout raiz. Precisa renderizar <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 380, padding: 24 }}>
          <h1>Algo deu errado</h1>
          <p>Ocorreu um erro inesperado. Tente recarregar.</p>
          {error.digest && <p style={{ fontSize: 12, opacity: 0.6 }}>Código: {error.digest}</p>}
          <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #999', cursor: 'pointer' }}>Tentar de novo</button>
        </div>
      </body>
    </html>
  );
}
