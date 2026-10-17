"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isLocaleSegment } from "@/lib/i18n/config";

const errorCopy = {
  en: {
    title: "Something went wrong!",
    description: "An unexpected error occurred while loading this page.",
    tryAgain: "Try again",
    goHome: "Back to Home",
  },
  es: {
    title: "¡Algo salió mal!",
    description: "Ocurrió un error inesperado al cargar esta página.",
    tryAgain: "Intentar de nuevo",
    goHome: "Volver al inicio",
  },
  "pt-br": {
    title: "Algo deu errado!",
    description: "Ocorreu um erro inesperado ao carregar esta página.",
    tryAgain: "Tentar novamente",
    goHome: "Voltar para o início",
  },
} as const;

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const rawLocale = Array.isArray(params?.locale)
    ? params.locale[0]
    : (params?.locale as string | undefined);
  const normalized = rawLocale?.toLowerCase();
  const localeSegment = isLocaleSegment(normalized) ? normalized : "en";
  const copy = errorCopy[localeSegment];

  useEffect(() => {
    console.error("[LocaleError]", error);
  }, [error]);

  const homeHref = `/${localeSegment}`;

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/20 text-center shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl font-bold">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        {error.digest && (
          <CardContent>
            <p className="font-mono text-xs text-muted-foreground">
              Digest: {error.digest}
            </p>
          </CardContent>
        )}
        <CardFooter className="flex justify-center gap-3 pt-2">
          <Button variant="default" onClick={() => reset()}>
            {copy.tryAgain}
          </Button>
          <Button variant="outline" asChild>
            <Link href={homeHref}>{copy.goHome}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
