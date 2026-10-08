const paths={
 focus:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',
 lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4M12 15v2',unlock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0M12 15v2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',eyeOff:'m3 3 18 18M9 5c6-2 11 5 13 7a20 20 0 0 1-4 4M6 6a25 25 0 0 0-4 6s4 7 10 7c2 0 3-.5 5-1',multi:'M3 3h7v7H3zM14 14h7v7h-7zM14 3h7v7M3 14v7h7',
 alignLeft:'M3 3v18M7 6h14v4H7zM7 14h9v4H7z',alignCenter:'M12 3v18M3 6h18v4H3zM7 14h10v4H7z',alignRight:'M21 3v18M3 6h14v4H3zM8 14h9v4H8z',alignTop:'M3 3h18M6 7h4v14H6zM14 7h4v9h-4z',alignMiddle:'M3 12h18M6 3h4v18H6zM14 7h4v10h-4z',alignBottom:'M3 21h18M6 3h4v14H6zM14 8h4v9h-4z',distributeX:'M3 3v18M21 3v18M9 6h6v12H9z',distributeY:'M3 3h18M3 21h18M6 9h12v6H6z',
 box:'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3ZM3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.3l9 4.5',
 select:'m5 3 14 9-7 1-3 7-4-17Z',text:'M4 5h16M12 5v15M8 20h8',image:'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M16 8h.01',
 shape:'M4 4h16v16H4z',line:'m4 20 16-16',barcode:'M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M20 5v14',qr:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM21 15v6h-6M18 18h3',
 mark:'M7 20V4m-4 4 4-4 4 4M17 20V4m-4 4 4-4 4 4',var:'M8 3H5v7l-2 2 2 2v7h3M16 3h3v7l2 2-2 2v7h-3',dieline:'M3 8h18M8 3v18M16 3v18M3 16h18M8 8h8v8H8z',
 layers:'m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6',save:'M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 folder:'M3 7V4h6l3 3h9v13H3V7Z',undo:'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',redo:'m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12',
 check:'m5 12 4 4 10-10',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',copy:'M8 8h13v13H8zM3 16V3h13',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
 align:'M4 3v18M8 6h12M8 12h8M8 18h12',fit:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M8 8h8v8H8z',grid:'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18',
 arrow:'M4 12h16m-6-6 6 6-6 6',more:'M5 12h.01M12 12h.01M19 12h.01',search:'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm6-2 6 6',file:'M5 3h9l5 5v13H5V3Zm9 0v5h5M8 12h8M8 16h6',
 settings:'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0',
 fragile:'M6 3h12l-3 9H9L6 3Zm6 9v8M8 21h8',dry:'M3 12a9 9 0 0 1 18 0H3Zm9 0v7a2 2 0 0 0 4 0M7 3v2M17 3v2',
 label:'M3 4h13l5 8-5 8H3V4ZM7 8h6M7 12h8M7 16h6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0'
};
export function iconV67(name,size=20){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="v67-icon"><path d="${paths[name]||paths.label}"/></svg>`;}
