// src/TerminalArt.js

export const art = {
  // The 'popped' style for the server buttons (3D effect)
  popped: (id) => ` ┌───┐\n │ ${id.toUpperCase()} │▒\n └───┘▒\n  ▒▒▒▒▒`,
  
  // The 'pushed' style for when a server is active
  pushed: (id) => `\n ┌───┐\n │ ${id.toUpperCase()} │\n └───┘`
};

// The main boot screen logo
export const BOOT_LOGO = `
[ WEYLAND-YUTANI CORP ]
[ MU/TH/UR 6000 ]

>> INITIALIZE UPLINK <<
`;

// Optional: Add a system header for the top of the terminal
export const SYSTEM_HEADER = (provider, channel, model) => 
  `STATION: ${provider.toUpperCase()} // ${channel.toUpperCase()} // ${model}`;