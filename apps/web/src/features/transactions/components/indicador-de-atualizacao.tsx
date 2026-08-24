/**
 * Torna visível o comportamento que é o cerne do desafio: a tela está esperando um status que
 * chega por evento. Sem isso, quem olha não sabe se deve recarregar.
 */
export function IndicadorDeAtualizacao({ ativo }: { ativo: boolean }) {
  if (!ativo) {
    return null;
  }

  return (
    <p aria-live="polite" className="flex items-center gap-2 text-xs text-amber-700">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
      </span>
      Aguardando a avaliação antifraude — a tela atualiza sozinha
    </p>
  );
}
