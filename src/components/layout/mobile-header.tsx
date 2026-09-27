"use client";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
export function MobileHeader({ onMenu }: { onMenu: () => void }) { return <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E7F1FB] px-4 lg:hidden"><div className="flex items-center gap-2"><button onClick={onMenu} className="rounded-xl p-2 text-[#5A7799]"><Menu size={20}/></button><Brand compact/><strong className="text-sm">RESPI<span className="text-[#2F78C8]">care</span></strong></div><Link href="/alerts" className="relative rounded-xl p-2 text-[#5A7799]"><Bell size={17}/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"/></Link></header> }
