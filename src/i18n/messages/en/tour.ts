import type { fr } from "../fr/index";
type M = typeof fr;

export const tour: M["tour"] = {
  prev: "Back",
  next: "Next",
  done: "Finish",
  skip: "Skip",
  replayTitle: "Getting started guide",
  replayText: "Replay the guided tour of My quotes and the quote editor.",
  replay: "Replay the guide",
  dashboard: {
    newQuote: {
      title: "Create a quote",
      text: "Start here: your first quote is ready in a few minutes.",
    },
    navClients: {
      title: "Your clients",
      text: "Save your clients and their ICE once, then pick them in every quote.",
    },
    navCatalogue: {
      title: "Your catalogue",
      text: "Your products and services with their prices, added to a quote in one click.",
    },
    navFollowups: {
      title: "Follow-ups",
      text: "Sent quotes still waiting for an answer, so you follow up at the right time.",
    },
    navSettings: {
      title: "Settings",
      text: "Logo, colours, bank details and numbering: change them at any time.",
    },
  },
  editor: {
    client: {
      title: "The client",
      text: "Pick a saved client or type one in. Their ICE appears on the quote.",
    },
    lines: {
      title: "The lines",
      text: "Add your items: quantity, unit price excl. VAT, and VAT at 20%, 10% or exempt.",
    },
    totals: {
      title: "The totals",
      text: "Subtotal, VAT per rate and total are worked out as you type, with the amount in words.",
    },
    preview: {
      title: "The A4 preview",
      text: "Your quote as your client will receive it. It updates live.",
    },
    share: {
      title: "Send the quote",
      text: "Download the PDF, copy the online acceptance link or send it on WhatsApp.",
    },
  },
};
