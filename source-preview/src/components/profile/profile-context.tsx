"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPerson } from "@/lib/api";
import type { Person } from "@/lib/types";

const PersonContext = React.createContext<Person | null>(null);

export function usePersonQuery(initial: Person) {
  return useQuery({
    queryKey: ["person", initial.username],
    queryFn: async () => (await fetchPerson(initial.username)) ?? initial,
    initialData: initial,
    staleTime: 10_000,
  });
}

export function PersonProvider({ person, children }: { person: Person; children: React.ReactNode }) {
  return <PersonContext.Provider value={person}>{children}</PersonContext.Provider>;
}

export function usePerson(): Person {
  const person = React.useContext(PersonContext);
  if (!person) throw new Error("usePerson must be used inside a profile page");
  return person;
}
