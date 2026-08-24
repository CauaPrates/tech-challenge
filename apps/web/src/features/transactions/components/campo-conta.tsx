'use client';

import { type FieldError } from 'react-hook-form';

interface CampoContaProps {
  id: string;
  rotulo: string;
  erro: FieldError | undefined;
  onGerar: () => void;
  children: React.ReactNode;
}

/**
 * As contas são identificadores opacos: o enunciado não define um cadastro, então não há de onde
 * consultá-las. Sem o botão de gerar, quem abre a tela não tem como saber o que digitar — foi o
 * problema mais concreto de usabilidade do formulário.
 */
export function CampoConta({ id, rotulo, erro, onGerar, children }: CampoContaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {rotulo}
        </label>
        <button
          type="button"
          onClick={onGerar}
          className="text-xs font-medium text-indigo-600 underline decoration-dotted underline-offset-2 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Gerar identificador
        </button>
      </div>
      {children}
      {erro === undefined ? (
        <span className="text-xs text-slate-500">
          Identificador da conta no formato UUID. Use o botão acima para gerar um.
        </span>
      ) : (
        <span role="alert" className="text-xs font-medium text-red-700">
          {erro.message}
        </span>
      )}
    </div>
  );
}
