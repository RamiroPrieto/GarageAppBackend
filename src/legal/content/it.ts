import type { LegalContent } from '../legal.types';

export const it: LegalContent = {
  updated: 'Ultimo aggiornamento: 25 novembre 2026',
  missing: {
    name: '[nome del titolare: da completare]',
    address: '[indirizzo: da completare]',
  },
  pages: ({ name, address, vat, email, euRepresentative }) => ({
    privacy: {
      title: 'Informativa sulla privacy',
      sections: [
        {
          body: [
            'Questa informativa spiega quali dati personali usa GarageApp, perché e quali sono i tuoi diritti. GarageApp è un’app che mette in contatto conducenti e proprietari di posti auto.',
          ],
        },
        {
          heading: '1. Titolare del trattamento',
          body: [
            [
              `Titolare: ${name}`,
              `Indirizzo: ${address}`,
              ...(vat ? [`Partita IVA / codice fiscale: ${vat}`] : []),
              `Contatto: ${email}`,
              ...(euRepresentative
                ? [`Rappresentante nell’Unione europea: ${euRepresentative}`]
                : []),
            ],
          ],
        },
        {
          heading: '2. Quali dati trattiamo',
          body: [
            [
              'Account: nome, cognome, email, password (conservata in forma cifrata irreversibile), telefono se lo aggiungi e foto del profilo se la carichi.',
              'Accesso con Google: l’identificativo del tuo account, il nome, l’email e la foto del profilo. Non riceviamo mai la tua password di Google.',
              'Veicoli: targa e, se li inserisci, marca, modello e colore.',
              'Posti auto pubblicati: titolo, descrizione, indirizzo, posizione sulla mappa, prezzo, caratteristiche e foto.',
              'Prenotazioni: posto auto, veicolo, orari, prezzo, stato e conferme di inizio.',
              'Pagamenti e crediti: importi, date, stato, saldo e identificativi di Stripe. I dati della carta sono ricevuti e conservati da Stripe; noi non li vediamo.',
              'Posizione: se la autorizzi, la posizione del dispositivo mentre usi l’app. Non la usiamo in background e non conserviamo uno storico nel tuo account.',
              'Fotocamera: solo se scegli di scansionare la carta al pagamento.',
              'Notifiche: se le accetti, l’identificativo del dispositivo necessario per inviarle.',
              'Assistenza: ciò che ci scrivi.',
              'Dati tecnici: indirizzo IP e registri del server, necessari per il funzionamento e la sicurezza. Le ricerche nelle vicinanze inviano le coordinate al server, che possono comparire in tali registri.',
            ],
            'I dati indicati come obbligatori quando ti registri, prenoti o pubblichi sono necessari per fornire il servizio. Telefono, foto, posizione e notifiche sono facoltativi.',
          ],
        },
        {
          heading: '3. Perché li usiamo e su quale base giuridica',
          body: [
            [
              'Creare l’account, pubblicare posti auto e gestire prenotazioni, pagamenti, promemoria e assistenza: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).',
              'Adempiere a obblighi contabili, fiscali e di legge: obbligo legale (art. 6, par. 1, lett. c).',
              'Prevenire frodi e abusi, proteggere il servizio e gestire reclami: legittimo interesse (art. 6, par. 1, lett. f).',
              'Posizione del dispositivo, accesso alle foto, fotocamera e notifiche: il tuo consenso (art. 6, par. 1, lett. a), che puoi revocare dalle impostazioni del telefono.',
            ],
            'Non vendiamo i tuoi dati, non mostriamo pubblicità, non ti tracciamo su altre app o siti e non prendiamo decisioni unicamente automatizzate che producano effetti giuridici su di te.',
          ],
        },
        {
          heading: '4. Chi può vedere i tuoi dati',
          body: [
            [
              'Il pubblico: i posti auto pubblicati, con indirizzo, posizione, prezzo e foto.',
              'Il proprietario del posto che prenoti: il tuo nome, la tua email, il tuo veicolo e i dati della prenotazione.',
              'Se sei proprietario e serve per trasferirti quanto ti spetta: le persone del nostro team che gestiscono quel pagamento.',
              'Le autorità, quando la legge lo richiede.',
            ],
            'Usiamo inoltre fornitori che trattano dati per permetterci di offrire il servizio:',
            [
              'Railway: server e database.',
              'Stripe: pagamenti con carta e prevenzione delle frodi.',
              'Google: accesso, mappe, indirizzi e consegna delle notifiche su Android.',
              'Apple: consegna delle notifiche su iOS.',
              'Expo: invio delle notifiche.',
              'Twilio: verifica del telefono via SMS.',
              'Resend: email di servizio e richieste di assistenza.',
              'Cloudflare: ricezione delle email che invii al nostro indirizzo di contatto.',
            ],
            'Alcuni di questi fornitori, come Stripe, Google o Apple, trattano dati anche come titolari autonomi secondo le proprie informative.',
          ],
        },
        {
          heading: '5. Trasferimenti fuori dallo Spazio economico europeo',
          body: [
            'Alcuni fornitori possono trattare dati fuori dallo Spazio economico europeo, anche negli Stati Uniti. In tal caso il trasferimento deve basarsi su una decisione di adeguatezza o su garanzie come le clausole contrattuali tipo della Commissione europea. Puoi chiederci maggiori informazioni via email.',
          ],
        },
        {
          heading: '6. Per quanto tempo li conserviamo',
          body: [
            [
              'Dati dell’account, veicoli e posti auto: finché hai un account.',
              'Quando elimini l’account: cancelliamo o rendiamo anonimi i tuoi dati personali, salvo ciò che dobbiamo conservare per legge o per difenderci da reclami.',
              'Registri di prenotazioni, pagamenti e crediti: conservati senza il tuo nome né la tua email per il periodo previsto dalle norme contabili e fiscali (in Italia, di regola, 10 anni). Stripe conserva i propri registri.',
              'Messaggi di assistenza: per il tempo necessario a risolverli e a documentare la risposta.',
              'Registri tecnici e copie di backup: per un periodo limitato.',
            ],
          ],
        },
        {
          heading: '7. I tuoi diritti',
          body: [
            `Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità o opposizione, e revocare il consenso, scrivendo a ${email}. Rispondiamo entro il termine di legge, di regola un mese.`,
            'Puoi modificare il profilo ed eliminare l’account dall’app. Puoi inoltre presentare reclamo all’autorità di protezione dei dati; in Italia, il Garante per la protezione dei dati personali (www.garanteprivacy.it).',
          ],
        },
        {
          heading: '8. Sicurezza',
          body: [
            'Usiamo connessioni cifrate, password protette con un algoritmo irreversibile, sessioni con scadenza e limiti ai tentativi di accesso. Nessun sistema è completamente sicuro: se noti un problema, scrivici.',
          ],
        },
        {
          heading: '9. Minori',
          body: [
            'GarageApp è riservata a chi ha almeno 18 anni. Se ritieni che un minore ci abbia fornito i suoi dati, scrivici e li elimineremo.',
          ],
        },
        {
          heading: '10. Modifiche',
          body: [
            'Se modifichiamo questa informativa, aggiorneremo la data di questa pagina e comunicheremo le modifiche importanti.',
          ],
        },
      ],
    },
    terms: {
      title: 'Termini e condizioni',
      sections: [
        {
          heading: '1. Chi siamo',
          body: [
            `GarageApp è gestita da ${name}, con sede in ${address}${vat ? `, partita IVA / codice fiscale ${vat}` : ''}. Contatto: ${email}. Creando un account o usando l’app accetti questi termini.`,
          ],
        },
        {
          heading: '2. Il servizio',
          body: [
            'GarageApp mette in contatto conducenti e proprietari di posti auto e gestisce la prenotazione e il pagamento. Salvo diversa indicazione, il posto è offerto dal suo proprietario e GarageApp non lo possiede né lo amministra. GarageApp non presta un servizio di custodia del veicolo.',
          ],
        },
        {
          heading: '3. Il tuo account',
          body: [
            'Devi avere almeno 18 anni, fornire informazioni veritiere e tenerle aggiornate. Sei responsabile della protezione del tuo accesso e di avvisarci se qualcuno lo usa senza permesso.',
          ],
        },
        {
          heading: '4. Prenotazioni',
          body: [
            [
              'La durata minima è di un’ora.',
              'Quando prenoti, il posto resta riservato per 10 minuti mentre paghi. Se non viene pagata in tempo, la prenotazione scade.',
              'La prenotazione è confermata quando il pagamento viene approvato.',
              'Conducente e proprietario confermano l’inizio nell’app, a partire da 10 minuti prima dell’orario.',
              'Devi usare il posto solo nell’orario prenotato, con un veicolo che vi entri, e liberarlo in tempo.',
            ],
          ],
        },
        {
          heading: '5. Prezzi e pagamenti',
          body: [
            'Il prezzo totale è mostrato prima del pagamento. I pagamenti con carta sono elaborati da Stripe. Se un addebito viene approvato quando la prenotazione è già scaduta o annullata, viene rimborsato sullo stesso mezzo di pagamento.',
          ],
        },
        {
          heading: '6. Crediti',
          body: [
            '100 crediti valgono 1 USD e servono solo a pagare prenotazioni su GarageApp. Non sono trasferibili ad altre persone né convertibili in denaro, salvo quando la legge lo richiede. Per le prenotazioni in euro, il numero di crediti è mostrato prima del pagamento.',
          ],
        },
        {
          heading: '7. Cancellazioni e rimborsi',
          body: [
            'Puoi annullare senza costi una prenotazione non ancora pagata. Per ora l’app non consente di annullare una prenotazione già pagata.',
            `Se il posto non era disponibile, non corrispondeva all’annuncio o hai avuto un altro problema, scrivici a ${email} o da Assistenza nell’app, con i dati della prenotazione. Valutiamo ogni caso.`,
            'Nulla di quanto sopra limita i diritti che la legge ti riconosce come consumatore, compresi quelli di recesso e di rimborso quando spettanti.',
          ],
        },
        {
          heading: '8. Proprietari',
          body: [
            [
              'Dichiari di avere il diritto di offrire il posto auto e di rispettare le norme applicabili, comprese quelle fiscali, condominiali e del tuo contratto.',
              'Devi pubblicare informazioni e foto veritiere, tenere aggiornata la disponibilità e rispettare le prenotazioni confermate.',
              'Sui pagamenti con carta GarageApp trattiene una commissione del 10% del prezzo. Il resto viene trasferito fuori dall’app, con il mezzo e nei tempi concordati con te.',
              'Mantieni i diritti sulle tue foto e sui tuoi testi e ci autorizzi a mostrarli su GarageApp finché sono pubblicati.',
            ],
          ],
        },
        {
          heading: '9. Uso consentito',
          body: [
            'Non puoi pubblicare contenuti falsi, illegali o offensivi, fingerti un’altra persona, usare i dati di altri utenti per scopi estranei alla prenotazione, eludere i pagamenti né compromettere la sicurezza del servizio. Puoi segnalare un contenuto scrivendoci.',
            'Possiamo rimuovere contenuti o sospendere account che violino questi termini o la legge. Salvo urgenza o divieto di legge, ti comunicheremo il motivo e potrai chiedere un riesame.',
          ],
        },
        {
          heading: '10. Responsabilità',
          body: [
            'Ogni utente risponde delle proprie azioni e dei danni che causa. Ci impegniamo a far funzionare bene il servizio, ma non garantiamo che sia sempre disponibile.',
            'Nei limiti consentiti dalla legge, non rispondiamo di ciò che fanno gli altri utenti né dello stato dei posti auto. Non escludiamo la responsabilità per dolo, colpa grave, danni alle persone né ogni altra che la legge non consenta di escludere.',
          ],
        },
        {
          heading: '11. Eliminare l’account',
          body: [
            'Puoi eliminare l’account in qualsiasi momento da Configurazione, se non hai prenotazioni in corso né crediti non usati. In questi casi, scrivici.',
          ],
        },
        {
          heading: '12. Modifiche, legge applicabile e reclami',
          body: [
            'Possiamo modificare questi termini e comunicheremo con ragionevole preavviso le modifiche importanti. Le modifiche non riguardano le prenotazioni già confermate.',
            'Si applica la legge del paese in cui è stabilito il gestore, senza privarti della tutela inderogabile della legge del paese in cui vivi. Se sei un consumatore, puoi rivolgerti al giudice del tuo luogo di residenza quando la legge lo prevede.',
            `Prima di avviare un reclamo ti chiediamo di scriverci a ${email}.`,
          ],
        },
      ],
    },
    'delete-account': {
      title: 'Eliminare il tuo account GarageApp',
      sections: [
        {
          heading: 'Dall’app',
          body: [
            'Apri GarageApp, vai in Configurazione, tocca «Elimina account» e conferma. Non si può annullare.',
          ],
        },
        {
          heading: 'Senza l’app',
          body: [
            `Scrivi a ${email} dall’email del tuo account con oggetto «Elimina account». Possiamo chiederti di confermare la tua identità.`,
          ],
        },
        {
          heading: 'Cosa viene eliminato',
          body: [
            [
              'Nome, email, telefono, foto, password e collegamento con Google.',
              'I tuoi veicoli e gli identificativi per le notifiche.',
              'I dati e le foto dei posti auto che hai pubblicato.',
              'Chiediamo a Stripe di eliminare il tuo profilo cliente.',
            ],
          ],
        },
        {
          heading: 'Cosa viene conservato',
          body: [
            'I registri di prenotazioni, pagamenti e crediti, senza il tuo nome né la tua email, per il periodo previsto dalle norme contabili e fiscali (in Italia, di regola, 10 anni). Copie di backup, registri tecnici e messaggi di assistenza possono essere conservati per un periodo limitato.',
          ],
        },
        {
          heading: 'Prenotazioni in corso o crediti',
          body: [
            `Se hai prenotazioni in corso, l’app ti chiederà di attendere che finiscano. Se hai crediti, puoi usarli o scriverci a ${email} e troveremo una soluzione per eliminare l’account.`,
          ],
        },
      ],
    },
    support: {
      title: 'Assistenza GarageApp',
      sections: [
        {
          body: [
            `Scrivici a ${email}. Se hai un account, puoi farlo anche da Configurazione, Assistenza.`,
            'Per un problema con una prenotazione, indica l’indirizzo del posto, il giorno e l’orario. Non inviare i dati della carta né la password.',
          ],
        },
        {
          heading: 'Gestore del servizio',
          body: [`${name}, ${address}${vat ? `, ${vat}` : ''}`],
        },
      ],
    },
  }),
};
