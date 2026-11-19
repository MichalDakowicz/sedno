// Grupa pigułek wyboru jednej z kilku opcji (.pigulki): zaznaczenie przesuwa się między pigułkami jak w pasku menu
// (Plywak, ta sama krzywa i to samo „Mniej ruchu”). Wybór kilku naraz (np. dni nauki) zostaje zwykłym .pigulki.
import type { HTMLAttributes, ReactNode } from "react";
import { Plywak } from "./Plywak";

export function Pigulki({ jako = "div", className, children, ...reszta }: { jako?: "div" | "nav"; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  const Tag = jako;
  return (
    <Tag className={className ? `pigulki ${className}` : "pigulki"} {...reszta}>
      <Plywak wyglad="pigulka" />
      {children}
    </Tag>
  );
}
