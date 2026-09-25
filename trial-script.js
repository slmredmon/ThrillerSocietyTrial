(function(){
  "use strict";

  const LOGO_URL = "logo.png";

  // ---- TRIAL BUILD ----
  // This is the trial build of Thriller Society: identical to the full
  // version in every feature, with one restriction — an account can only
  // have TRIAL_CASE_LIMIT case files at once, open or closed both counting
  // toward it (deleting a case frees up a slot, since the count is just
  // however many case documents currently exist). Once the limit is
  // reached, starting a new case is blocked and an upsell modal points to
  // the full version instead.
  const TRIAL_CASE_LIMIT = 2;

  /* ============================== FIREBASE ============================== */
  // Config comes from firebase-config.js (loaded before this file — see
  // firebase-config.example.js and the README for setup). If that file is
  // missing or still has placeholder values, the app falls back to
  // browser-only localStorage automatically — nothing else breaks, you just
  // don't get real accounts or cross-device sync until it's connected.
  const FIREBASE_CONFIG = (typeof window!=='undefined' && window.FIREBASE_CONFIG) || null;
  const FIREBASE_READY = !!(
    typeof firebase !== 'undefined' &&
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0
  );
  let auth = null;
  let authScreenMode = 'signup'; // 'signup' | 'login' — which form the auth screen shows
  let authError = '';
  function firebaseErrorMessage(e){
    const code = (e && e.code) || '';
    if(code==='auth/email-already-in-use') return "That email already has an account — try logging in instead.";
    if(code==='auth/invalid-email') return "That email address doesn't look right.";
    if(code==='auth/weak-password') return "Password should be at least 6 characters.";
    if(code==='auth/wrong-password' || code==='auth/user-not-found' || code==='auth/invalid-credential') return "Email or password is incorrect.";
    if(code==='permission-denied') return "Firestore rejected that (missing or insufficient permissions) — the Community Board needs the publicTheories block added to your Firestore Security Rules. See README.md → Connecting Firebase, step 6.";
    return (e && e.message) || "Something went wrong — please try again.";
  }

  /* ============================== ICONS ============================== */
  const ICONS = {
    magnifier:'<circle cx="10.5" cy="10.5" r="6.2"/><line x1="15.2" y1="15.2" x2="20" y2="20"/>',
    fingerprint:'<path d="M12 3c-3.5 0-6 2.4-6 6v3c0 4-2 6-2 6M12 3c3.5 0 6 2.4 6 6v3c0 4 1 6 2 7M8 9c0-2 1.7-3.6 4-3.6s4 1.6 4 3.6v3.2c0 3.3 1.2 5 2.3 6.3M8 9v3.2c0 4-1.6 6-2.8 7.3M12 9.4c1.4 0 2.4 1 2.4 2.3v2.8c0 2.6 1 4.3 2 5.7"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ghost:'<circle cx="12" cy="12" r="8.4"/><path d="M12 8.4v4M12 15.8h.01"/>',
    plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash:'<path d="M5 7h14M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7M7 7l1 12.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5L17 7"/>',
    gear:'<circle cx="12" cy="12" r="3.1"/><path d="M12 3.6v2M12 18.4v2M20.4 12h-2M5.6 12h-2M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4M17.6 17.6l-1.4-1.4M7.8 7.8L6.4 6.4"/>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    book:'<path d="M4.5 5.2C4.5 4 5.5 3.5 6.5 3.5h5.8c1 0 2 .5 2 1.7v14.6c0 1.1-1 .5-2 .5H6.5c-1 0-2-.4-2-1.7z"/><path d="M14.3 5.2c0-1.2 1-1.7 2-1.7h1.2c1 0 2 .5 2 1.7v14.1c0 1.3-1 1.9-2 1.9h-1.2c-1 0-2 .3-2-.5"/>',
    warn:'<path d="M12 3.5 21.5 20h-19z"/><path d="M12 9.5v5M12 17.3h.01"/>',
    x:'<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    seal:'<circle cx="12" cy="12" r="8.5"/><path d="M8.6 12.2l2.4 2.4 4.6-4.9"/>',
    pipe:'<path d="M3 18c3.6-.4 6.4-2.3 7.8-5.4"/><rect x="10" y="11.3" width="6.2" height="7" rx="2.2" transform="rotate(12 13.1 14.8)"/><path d="M11.3 14.6c1.1-.7 2.6-.7 3.7 0"/><path d="M11.7 16.1c.9-.55 2-.55 2.9 0"/><path d="M12.1 17.5c.6-.35 1.3-.35 1.9 0"/><path d="M15.3 10.6c.5-.8.3-1.6-.4-2.3"/><path d="M16.6 9.4c.4-.7.2-1.4-.4-1.9"/>',
    link:'<path d="M9 15l6-6"/><path d="M14 5.5l1-1a3.5 3.5 0 0 1 5 5l-1.5 1.5"/><path d="M10 18.5l-1 1a3.5 3.5 0 0 1-5-5l1.5-1.5"/>',
    star:'<path d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L2 9.7l7.1-.6z"/>'
  };
  function icon(name,cls){return '<svg class="icon '+(cls||'')+'" viewBox="0 0 24 24">'+ICONS[name]+'</svg>';}

  /* ============================== HELPERS ============================== */
  function escapeHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function uid8(){
    try{ return crypto.randomUUID(); }catch(e){ return 'id-'+Date.now()+'-'+Math.random().toString(16).slice(2); }
  }
  function fmtDate(iso){
    if(!iso) return '';
    try{ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }catch(e){ return ''; }
  }
  function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
  function byRecentlyUpdated(a,b){
    return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''));
  }
  function normName(s){
    return String(s||'').toLowerCase().trim()
      .replace(/^(mr|mrs|ms|miss|dr|detective|officer|inspector|the)\.?\s+/,'')
      .replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  }
  function namesMatch(a,b){
    const na=normName(a), nb=normName(b);
    if(!na||!nb) return false;
    if(na===nb) return true;
    const wa=na.split(' '), wb=nb.split(' ');
    return wa.some(w=>w.length>2&&wb.includes(w));
  }
  function bookKey(book){
    return ((book&&book.title)||'').trim().toLowerCase()+'|'+((book&&book.author)||'').trim().toLowerCase();
  }

  function h(strings,...vals){ return strings.reduce((acc,s,i)=>acc+s+(vals[i]!=null?vals[i]:''),''); }

  /* ============================== COVER GENERATOR ============================== */
  const COVER_PALETTES = [
    ['#07222a','#0f5c5e','#dff3ee'],
    ['#0a1330','#1d3a6e','#dce6f7'],
    ['#1c130a','#5c3a17','#e9dcc0'],
    ['#150f28','#38265f','#e3d9f5'],
    ['#0f1710','#264d2b','#dfe6c8'],
    ['#101a24','#2c4a5e','#dce8ee']
  ];
  function hashStr(s){
    let h=0; s=String(s);
    for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; }
    return Math.abs(h);
  }
  function coverStyle(title){
    const p = COVER_PALETTES[hashStr(title||'x')%COVER_PALETTES.length];
    return {bg:`linear-gradient(165deg, ${p[1]} 0%, ${p[0]} 65%)`, fg:p[2]};
  }
  function fileNo(seed){
    return String(1000+(hashStr(seed)%8999));
  }
  function coverHTML(title,author,opts){
    opts = opts||{};
    const st = coverStyle(title||'');
    const sizeClass = opts.mini ? '' : '';
    const words = (title||'Untitled Case').trim().split(/\s+/);
    let titleSize = '30px';
    const len=(title||'').length;
    if(len>34) titleSize='19px'; else if(len>22) titleSize='23px'; else if(len>14) titleSize='27px';
    const imgTag = opts.imgUrl ? `<img class="cover-real-img" src="${escapeHtml(opts.imgUrl)}" alt="${escapeHtml(title||'Book cover')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return h`<div class="cover" style="background:${st.bg};color:${st.fg}">
      ${imgTag}
      <div>
        <div class="cover-eyebrow">File No. ${fileNo(title||'x')}</div>
      </div>
      <div class="cover-title" style="font-size:${titleSize}">${escapeHtml(title||'Untitled Case')}</div>
      <div class="cover-author">${author?('by '+escapeHtml(author)):'author unknown'}</div>
    </div>`;
  }

  /* ============================== REAL COVER LOOKUP ============================== */
  // Best-effort lookup against free, public book-data APIs (Google Books, then
  // Open Library as a fallback). Never blocks rendering — the generated cover
  // above always shows first/underneath, and stays put if no real cover is
  // found or the image URL later fails to load.
  //
  // Common thriller titles ("The Housemaid", "The Girl Upstairs", etc.) match
  // dozens of editions/duplicates/foreign printings in these catalogs, so we
  // scan a handful of results for the first one that actually carries a cover
  // image rather than trusting the single top-ranked hit, and fall back to a
  // looser keyword search if the strict intitle:/inauthor: query comes up empty.
  async function fetchRealCover(title, author){
    const t = (title||'').trim();
    if(!t) return null;

    const googleQueries = [];
    const strictParts = ['intitle:'+t];
    if(author) strictParts.push('inauthor:'+author);
    googleQueries.push(strictParts.join('+'));
    googleQueries.push([t, author].filter(Boolean).join(' ')); // looser, no operators

    for(const q of googleQueries){
      try{
        const url = 'https://www.googleapis.com/books/v1/volumes?maxResults=5&q='+encodeURIComponent(q);
        const res = await fetch(url);
        if(res.ok){
          const data = await res.json();
          const items = data.items || [];
          for(const item of items){
            const links = item.volumeInfo && item.volumeInfo.imageLinks;
            const raw = links && (links.thumbnail || links.smallThumbnail);
            if(raw) return { url: raw.replace(/^http:/,'https:'), source:'google' };
          }
        }
      }catch(e){ /* try the next query / fall through to Open Library */ }
    }

    // Open Library's &author= filter matches its own indexed spelling fairly
    // strictly — a free-text author name that's close-but-not-identical (a
    // missing middle initial, a period, etc.) can zero out otherwise-good
    // title matches. So: try title+author first, then fall back to a
    // title-only search if that comes up empty.
    try{
      const withAuthorCover = await lookupOpenLibrary(t, author);
      if(withAuthorCover) return withAuthorCover;
      if(author){
        const titleOnlyCover = await lookupOpenLibrary(t, '');
        if(titleOnlyCover) return titleOnlyCover;
      }
    }catch(e){ /* give up — generated cover stays */ }

    return null;
  }

  async function lookupOpenLibrary(t, author){
    try{
      let olUrl = 'https://openlibrary.org/search.json?limit=5&fields=cover_i&title='+encodeURIComponent(t);
      if(author) olUrl += '&author='+encodeURIComponent(author);
      const res = await fetch(olUrl);
      if(res.ok){
        const data = await res.json();
        const docs = data.docs || [];
        const withCover = docs.find(d=>d.cover_i);
        if(withCover) return { url:'https://covers.openlibrary.org/b/id/'+withCover.cover_i+'-L.jpg', source:'openlibrary' };
      }
    }catch(e){ /* caller decides what to try next */ }
    return null;
  }

  const coverLookupsInFlight = new Set();
  // Cases we already tried this session and found nothing for. We deliberately
  // do NOT persist a permanent "gave up" flag for a miss — a common title can
  // fail one lookup pass (ambiguous matches, a transient API hiccup) and
  // succeed the next, so every fresh page load gets one more attempt for any
  // case that still has no real cover.
  const coverSessionMissed = new Set();
  function ensureCoverForCase(c){
    if(!c || !c.id || c.coverUrl || c.coverManual || coverLookupsInFlight.has(c.id) || coverSessionMissed.has(c.id)) return;
    coverLookupsInFlight.add(c.id);
    fetchRealCover(c.book && c.book.title, c.book && c.book.author).then(result=>{
      if(!result){ coverSessionMissed.add(c.id); return; }
      const patch = { coverChecked:true, coverUrl: result.url, coverSource: result.source };
      return DAL.updateCase(c.id, patch).then(()=>{
        Object.assign(c, patch);
        if(activeCase && activeCase.id===c.id) Object.assign(activeCase, patch);
        render();
      });
    }).catch(()=>{ coverSessionMissed.add(c.id); })
      .finally(()=>{ coverLookupsInFlight.delete(c.id); });
  }

  // Manual cover override — for books that simply aren't in Google Books or
  // Open Library (small-press, self-published, very new releases). Once set,
  // ensureCoverForCase leaves it alone; "Use auto lookup" clears it and lets
  // the automatic search try again.
  async function setCustomCover(url, source){
    const c = activeCase;
    if(!c) return;
    const patch = { coverUrl:url, coverManual:true, coverSource:source||'manual', coverChecked:true, updatedAt:new Date().toISOString() };
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    coverEditOpen = false;
    coverUploadError = '';
    render();
  }

  // Turns a picked JPG file into a small thumbnail data URL (long edge capped
  // at THUMB_MAX_DIM) so it's cheap to store directly on the case document —
  // there's no image-hosting backend here, so the resized image itself
  // becomes the cover URL.
  const THUMB_MAX_DIM = 300;
  function coverFileToThumbnail(file){
    return new Promise((resolve, reject)=>{
      if(!file) { reject(new Error('No file selected.')); return; }
      const looksLikeJpeg = /^image\/jpe?g$/i.test(file.type) || /\.(jpe?g)$/i.test(file.name||'');
      if(!looksLikeJpeg){ reject(new Error('Please choose a JPG image.')); return; }
      if(file.size > 8*1024*1024){ reject(new Error('That image is too large (8MB max).')); return; }
      const reader = new FileReader();
      reader.onerror = ()=>reject(new Error('Could not read that file.'));
      reader.onload = ()=>{
        const img = new Image();
        img.onerror = ()=>reject(new Error('Could not read that image.'));
        img.onload = ()=>{
          let w = img.width, h = img.height;
          if(!w || !h){ reject(new Error('Could not read that image.')); return; }
          if(w>h){ if(w>THUMB_MAX_DIM){ h = Math.round(h*THUMB_MAX_DIM/w); w = THUMB_MAX_DIM; } }
          else if(h>THUMB_MAX_DIM){ w = Math.round(w*THUMB_MAX_DIM/h); h = THUMB_MAX_DIM; }
          try{
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          }catch(e){ reject(new Error('Could not process that image.')); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function resetCover(){
    const c = activeCase;
    if(!c) return;
    const patch = { coverUrl:null, coverManual:false, coverSource:null, coverChecked:false, updatedAt:new Date().toISOString() };
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    coverSessionMissed.delete(c.id);
    coverEditOpen = false;
    render();
    ensureCoverForCase(activeCase);
  }

  // Locks the case to the generated placeholder cover — for when an
  // automatic match turns out to be the wrong book entirely (a same-titled
  // book by a different author, say). Unlike resetCover, this does NOT let
  // ensureCoverForCase search again on its own; "Use auto lookup" is what
  // undoes this if the reader wants to give the search another try later.
  async function useGenericCover(){
    const c = activeCase;
    if(!c) return;
    const patch = { coverUrl:null, coverManual:true, coverSource:null, coverChecked:true, updatedAt:new Date().toISOString() };
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    coverSessionMissed.add(c.id);
    coverEditOpen = false;
    render();
  }

  /* ============================== VERDICT ENGINE ============================== */
  function buildVerdict(kase, actualCulprit){
    const others = kase.suspects||[];
    const prime = kase.primary || null;
    const finalS = kase.finalSuspect || null;
    const all = [];
    if(prime) all.push({name:prime.name, theory:prime.theory, trust:null, role:'prime'});
    others.forEach(s=>all.push({name:s.name, theory:s.theory, trust:s.trust, role:'other'}));

    const solved = finalS ? namesMatch(finalS.name, actualCulprit) : false;
    const culpritEntry = all.find(s=>namesMatch(s.name, actualCulprit));
    const stayedWithPrime = prime && finalS && namesMatch(prime.name, finalS.name);
    const totalConsidered = all.length;

    const strengths=[]; const weaknesses=[];

    if(solved){
      strengths.push(`You named ${escapeHtml(finalS.name)} and the book confirmed it — the case is closed on your word.`);
      if(stayedWithPrime){
        strengths.push(`Your first instinct never wavered. ${escapeHtml(prime.name)} was suspect number one on day one, and stayed there to the end.`);
      } else if(prime){
        strengths.push(`You were willing to abandon an early theory — ${escapeHtml(prime.name)} was your opening suspect, but the evidence pulled you toward ${escapeHtml(finalS.name)} instead, and that instinct paid off.`);
      }
      if(culpritEntry && culpritEntry.trust!=null && culpritEntry.trust>=7){
        strengths.push(`You rated ${escapeHtml(culpritEntry.name)} at ${culpritEntry.trust}/10 well before the reveal — you weren't just right, you were confident and right.`);
      }
      if(totalConsidered>=3){
        strengths.push(`You built a real suspect board — ${totalConsidered} names considered before you committed to one.`);
      }
    } else {
      if(culpritEntry){
        if(culpritEntry.trust!=null){
          weaknesses.push(`${escapeHtml(actualCulprit)} was on your list the whole time, trusted at just ${culpritEntry.trust}/10 — you had the right file open and closed it too soon.`);
        } else {
          weaknesses.push(`${escapeHtml(actualCulprit)} was your very first suspect — you had them, then talked yourself out of it.`);
        }
      } else {
        weaknesses.push(`${escapeHtml(actualCulprit)} never appears on your suspect board at all — a genuine blind spot, not a bad guess.`);
      }
      if(stayedWithPrime){
        weaknesses.push(`You never moved off your opening theory. Good instincts stay open to revision — this one didn't get the chance.`);
      }
      if(finalS){
        weaknesses.push(`You locked in ${escapeHtml(finalS.name)} at 50% and the story proved you wrong — the case was decided before the last clues landed.`);
      }
    }

    // Always-present observations
    if(totalConsidered<=1){
      weaknesses.push(`Only one name ever made it onto your board. A wider net catches more red herrings — and more real suspects.`);
    } else if(totalConsidered>=4 && solved){
      strengths.push(`Casting a wide net didn't slow you down — you still landed on the right name.`);
    }
    if(!solved && totalConsidered>=4){
      strengths.push(`To be fair: you considered ${totalConsidered} suspects. This wasn't a careless read, the twist just out-ran you.`);
    }

    if(strengths.length===0) strengths.push(`You showed up, made a call, and saw it through to the last page. That's the job.`);
    if(weaknesses.length===0) weaknesses.push(`Nothing to needle you on here — clean work.`);

    const avgTrust = others.length ? (others.reduce((a,s)=>a+(Number(s.trust)||0),0)/others.length) : 0;

    const journal = kase.journal || [];
    const cluesFound = journal.filter(e=>e.type==='clue').length;
    const liesDetected = journal.filter(e=>e.type==='lie').length;
    const connectionsMade = journal.filter(e=>e.type==='connection').length;
    const totalTwists = (kase.twists||[]).length;

    if(cluesFound + liesDetected + connectionsMade >= 5){
      strengths.push(`You kept a real paper trail &mdash; ${cluesFound} clue${cluesFound===1?'':'s'} found, ${liesDetected} lie${liesDetected===1?'':'s'} caught, and ${connectionsMade} connection${connectionsMade===1?'':'s'} drawn along the way.`);
    } else if(cluesFound + liesDetected + connectionsMade === 0){
      weaknesses.push(`You didn't log a single clue, lie, or connection this time &mdash; the journal is one more place to catch yourself out later.`);
    }
    if(totalTwists>0){
      strengths.push(`You called ${totalTwists} predicted twist${totalTwists===1?'':'s'} along the way.`);
    }

    return {
      solved, culpritConsidered: !!culpritEntry,
      strengths: strengths.slice(0,6), weaknesses: weaknesses.slice(0,6),
      stats:{ totalConsidered, avgTrust: avgTrust? avgTrust.toFixed(1):'—', stayedWithPrime: !!stayedWithPrime,
        cluesFound, liesDetected, connectionsMade, totalTwists }
    };
  }

  /* ============================== DATA ACCESS LAYER ============================== */
  let mode = 'loading'; // 'cloud' | 'local'
  let db=null, uid=null;
  let profileRef=null, casesRef=null;

  const LOCAL_KEY = 'thriller_society_local_v1';
  function localStore(){
    try{
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw? JSON.parse(raw) : {profile:null, cases:{}};
    }catch(e){ return {profile:null, cases:{}}; }
  }
  function localSave(store){
    try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(store)); }catch(e){}
  }

  const DAL = {
    async getProfile(){
      if(mode==='cloud'){
        const snap = await profileRef.get();
        return snap.exists ? snap.data() : null;
      }
      return localStore().profile;
    },
    async setProfile(data){
      if(mode==='cloud'){ await profileRef.set(data); return; }
      const s = localStore(); s.profile = data; localSave(s);
    },
    async updateProfile(patch){
      if(mode==='cloud'){ await profileRef.update(patch); return; }
      const s = localStore(); s.profile = Object.assign({}, s.profile, patch); localSave(s);
    },
    async listCases(){
      if(mode==='cloud'){
        const snap = await casesRef.orderBy('createdAt','desc').limit(200).get();
        return snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      }
      const s = localStore();
      return Object.keys(s.cases).map(id=>Object.assign({id}, s.cases[id]))
        .sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
    },
    async getCase(id){
      if(mode==='cloud'){
        const snap = await casesRef.doc(id).get();
        return snap.exists ? Object.assign({id}, snap.data()) : null;
      }
      const s = localStore();
      return s.cases[id] ? Object.assign({id}, s.cases[id]) : null;
    },
    async createCase(data){
      if(mode==='cloud'){
        const ref = await casesRef.add(data);
        return ref.id;
      }
      const id = uid8();
      const s = localStore(); s.cases[id]=data; localSave(s);
      return id;
    },
    async updateCase(id, patch){
      if(mode==='cloud'){ await casesRef.doc(id).update(patch); return; }
      const s = localStore();
      s.cases[id] = Object.assign({}, s.cases[id], patch); localSave(s);
    },
    async deleteCase(id){
      if(mode==='cloud'){ await casesRef.doc(id).delete(); return; }
      const s = localStore(); delete s.cases[id]; localSave(s);
    },
    async wipeEverything(){
      if(mode==='cloud'){
        const snap = await casesRef.get();
        for(const d of snap.docs){ await casesRef.doc(d.id).delete(); }
        const pubSnap = await db.collection('publicTheories').where('uid','==',uid).get();
        for(const d of pubSnap.docs){ await d.ref.delete(); }
        await profileRef.delete();
        return;
      }
      localSave({profile:null, cases:{}});
    },
    async setCasePublic(caseId, isPublic, payload){
      if(mode==='cloud'){
        const ref = db.collection('publicTheories').doc(uid+'_'+caseId);
        if(isPublic){ await ref.set(Object.assign({uid, caseId}, payload)); }
        else { await ref.delete(); }
        return;
      }
      const s = localStore();
      s.community = s.community || {};
      if(isPublic){ s.community[caseId] = Object.assign({uid:'local', caseId}, payload); }
      else { delete s.community[caseId]; }
      localSave(s);
    },
    async listCommunityTheories(bk){
      if(mode==='cloud'){
        const snap = await db.collection('publicTheories').where('bookKey','==',bk).limit(100).get();
        return snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      }
      const s = localStore();
      const all = Object.keys(s.community||{}).map(k=>Object.assign({id:k}, s.community[k]));
      return all.filter(e=>e.bookKey===bk);
    }
  };

  /* ============================== APP STATE ============================== */
  let profile = null;
  let cases = [];
  let view = 'loading';
  let activeCaseId = null;
  let activeCase = null;
  let wizard = null;
  let modal = null;
  let journalFilter = 'all'; // 'all' | 'clue' | 'lie' | 'connection'
  let journalDraftType = 'clue';
  let communityTheories = [];
  let communityBoardError = '';
  let coverEditOpen = false; // whether the "custom cover URL" form is showing on the case page
  let coverUploadError = ''; // feedback from the last JPG upload attempt, if it failed

  const app = document.getElementById('app');

  /* ============================== INIT ============================== */
  async function init(){
    try{
      if(FIREBASE_READY){
        if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        // Wait for Firebase's one-time initial auth check so we know right
        // away whether this browser already has a signed-in user.
        uid = await new Promise(resolve=>{
          const unsub = auth.onAuthStateChanged(user=>{
            unsub();
            resolve(user ? user.uid : null);
          });
        });
      }
    }catch(e){ /* fall through to local mode */ }

    if(db){
      mode='cloud';
      if(uid){
        profileRef = db.collection('users').doc(uid);
        casesRef = profileRef.collection('cases');
        profile = await DAL.getProfile();
      }
    } else {
      mode='local';
      profile = await DAL.getProfile();
    }

    if(profile && profile.status==='deactivated'){
      view='deactivated';
    } else if(profile){
      cases = await DAL.listCases();
      view='dashboard';
    } else {
      view='signup';
    }
    render();
  }

  /* ============================== RENDER ROOT ============================== */
  function render(){
    // Give the summary page a real document title so a browser's "Save as
    // PDF" print destination suggests a sensible filename instead of just
    // "Thriller Society".
    try{
      document.title = (view==='summary' && activeCase && activeCase.book) ? `${activeCase.book.title} — Case Summary` : 'Thriller Society — Trial';
    }catch(e){}
    let html = '';
    html += topbarHTML();
    html += '<div class="view">';
    if(view==='loading') html += `<div class="center-view"><span class="stamp">loading the case file…</span></div>`;
    else if(view==='signup') html += signupHTML();
    else if(view==='deactivated') html += deactivatedHTML();
    else if(view==='dashboard') html += dashboardHTML();
    else if(view==='wizard') html += wizardHTML();
    else if(view==='case') html += caseHTML();
    else if(view==='summary') html += summaryHTML();
    else if(view==='community') html += communityHTML();
    else if(view==='history') html += historyHTML();
    else if(view==='settings') html += settingsHTML();
    html += '</div>';
    html += `<div class="footer-note">THRILLER SOCIETY &middot; every reader is a detective<div style="margin-top:6px;opacity:.7">Copyright &copy; 2026. All rights reserved.</div></div>`;
    app.innerHTML = html;
    if(modal){
      app.insertAdjacentHTML('beforeend', modalWrapHTML(currentModalHTML()));
    }
    bind();
  }

  function currentModalHTML(){
    if(!modal) return '';
    if(modal==='resolve') return resolveModalHTML();
    if(modal==='add-suspect') return addSuspectModalHTML();
    if(modal.type==='confirm') return confirmModalHTML(modal);
    if(modal==='upsell') return upsellModalHTML();
    return '';
  }

  function trialCapped(){ return cases.length >= TRIAL_CASE_LIMIT; }

  function topbarHTML(){
    if(view==='signup') return '';
    const gated = view==='deactivated';
    return h`<div class="topbar">
      <div class="brand" data-action="go-dashboard">
        <div class="brand-mark"><img src="${LOGO_URL}" alt="Thriller Society"></div>
        <div class="brand-text"><b>Thriller Society <span class="badge badge-trial" style="margin-left:6px;vertical-align:middle">Trial</span></b><span>Don't just read it. Investigate.</span></div>
      </div>
      ${(profile && !gated) ? h`<div class="top-actions">
        ${mode==='local' ? `<span class="badge badge-demo" title="Saved to this browser only">${icon('warn')} local</span>` : ''}
        ${view!=='wizard' ? (trialCapped()
          ? `<button class="btn btn-gold" data-action="open-upsell" style="padding:8px 14px;font-size:14px">${icon('seal')} Get the full version</button>`
          : `<button class="icon-btn" data-action="start-wizard" title="Start a new case">${icon('plus')}</button>`) : ''}
        <button class="icon-btn" data-action="go-history" title="Case history">${icon('book')}</button>
        <button class="icon-btn" data-action="go-settings" title="Account">${icon('gear')}</button>
      </div>` : ''}
    </div>`;
  }

  /* ============================== SIGNUP / LOGIN ============================== */
  function signupHTML(){
    if(mode==='cloud' && authScreenMode==='login'){
      return h`<div class="center-view">
        <div class="card auth-card pad">
          <div class="brand-logo-lg"><img src="${LOGO_URL}" alt="Thriller Society — Read. Investigate. Solve."></div>
          <h1 class="sr-only">Thriller Society</h1>
          <div class="auth-sub">Welcome back, detective</div>
          ${authError ? `<div class="banner banner-warn">${icon('warn')}<span>${escapeHtml(authError)}</span></div>` : ''}
          <form class="auth-form" data-form="login">
            <div class="field">
              <label for="li-email">Email</label>
              <input class="input" id="li-email" name="email" type="email" placeholder="you@example.com" required>
            </div>
            <div class="field">
              <label for="li-password">Password</label>
              <input class="input" id="li-password" name="password" type="password" required minlength="6">
            </div>
            <button class="btn btn-primary btn-block" type="submit">Log in</button>
          </form>
          <p style="text-align:center;margin-top:16px;font-size:15px;color:var(--text-faint)">New here? <button type="button" data-action="toggle-auth-mode" style="background:none;border:none;padding:0;color:var(--gold);text-decoration:underline;cursor:pointer;font:inherit">Create an account</button></p>
        </div>
      </div>`;
    }

    return h`<div class="center-view">
      <div class="card auth-card pad">
        <div class="brand-logo-lg"><img src="${LOGO_URL}" alt="Thriller Society — Read. Investigate. Solve."></div>
        <h1 class="sr-only">Thriller Society</h1>
        <div class="auth-sub">Sign up, then open your first case file below</div>
        <div class="banner banner-demo">${icon('seal')}<span><b>Trial version:</b> this account gets ${TRIAL_CASE_LIMIT} free case files, opening with the one you build below.</span></div>
        ${mode==='local' ? `<div class="banner banner-demo">${icon('warn')}<span>No database is connected yet, so your account will be saved to this browser only. Connect Firebase (see README.md) for a permanent account you can reach from any device.</span></div>` : ''}
        ${authError ? `<div class="banner banner-warn">${icon('warn')}<span>${escapeHtml(authError)}</span></div>` : ''}
        <form class="auth-form" data-form="signup">
          <div class="field">
            <label for="su-email">Email</label>
            <input class="input" id="su-email" name="email" type="email" placeholder="you@example.com" required>
          </div>
          ${mode==='cloud' ? `<div class="field">
            <label for="su-password">Password</label>
            <input class="input" id="su-password" name="password" type="password" placeholder="At least 6 characters" required minlength="6">
          </div>` : ''}
          <div class="field">
            <label for="su-name">What should we call you, detective?</label>
            <input class="input" id="su-name" name="name" type="text" placeholder="Your name" required maxlength="40">
          </div>
          <div class="form-divider"><span>Your First Case</span></div>
          <div class="field">
            <label for="su-book">What book are you building your first case on?</label>
            <input class="input" id="su-book" name="bookTitle" type="text" placeholder="e.g. The Silent Patient" required>
          </div>
          <div class="field">
            <label for="su-author">Author <span class="hint">(optional)</span></label>
            <input class="input" id="su-author" name="bookAuthor" type="text" placeholder="e.g. Alex Michaelides">
          </div>
          <button class="btn btn-primary btn-block" type="submit">Join &amp; Open the Case File</button>
        </form>
        ${mode==='cloud' ? `<p style="text-align:center;margin-top:16px;font-size:15px;color:var(--text-faint)">Already have an account? <button type="button" data-action="toggle-auth-mode" style="background:none;border:none;padding:0;color:var(--gold);text-decoration:underline;cursor:pointer;font:inherit">Log in</button></p>` : ''}
      </div>
    </div>`;
  }

  /* ============================== DEACTIVATED ============================== */
  function deactivatedHTML(){
    return h`<div class="center-view">
      <div class="card auth-card pad">
        <div class="auth-seal" style="border-color:var(--warn-dim);color:var(--warn-2)">${icon('x')}</div>
        <h1 class="auth-title">Account Deactivated</h1>
        <div class="auth-sub">${escapeHtml(profile.email||'')}</div>
        <p style="color:var(--text-dim);font-size:17px;margin-bottom:22px">Your case files are safe and waiting. Reactivate to pick up where you left off.</p>
        <div class="btn-row" style="justify-content:center">
          <button class="btn btn-gold" data-action="reactivate">Reactivate my account</button>
          ${mode==='cloud' ? `<button class="btn btn-ghost" data-action="logout">Log out</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ============================== DASHBOARD ============================== */
  function dashboardHTML(){
    // Every case ever entered on this account — grouped, never capped.
    const active = cases.filter(c=>c.status!=='closed').slice().sort(byRecentlyUpdated);
    const closed = cases.filter(c=>c.status==='closed').slice().sort(byRecentlyUpdated);
    active.forEach(ensureCoverForCase);
    closed.forEach(ensureCoverForCase);
    const solved = closed.filter(c=>c.resolution&&c.resolution.solved);
    const escaped = closed.filter(c=>!(c.resolution&&c.resolution.solved));
    const solveRate = closed.length ? Math.round(solved.length/closed.length*100) : null;

    let body = h`<div class="card hero-card">
      <div class="hero-inner">
        <div>
          <div class="hero-greeting">Welcome back</div>
          <div class="hero-title">${escapeHtml(profile.displayName||'Detective')}</div>
        </div>
      </div>`;

    if(cases.length>0){
      body += h`<div class="hero-stats">
        <div class="stat-row" style="margin-top:0">
          <div class="stat-chip"><b>${cases.length}</b><span>total cases</span></div>
          <div class="stat-chip"><b>${active.length}</b><span>in progress</span></div>
          <div class="stat-chip"><b>${solved.length}</b><span>solved</span></div>
          <div class="stat-chip"><b>${escaped.length}</b><span>missed it</span></div>
          <div class="stat-chip"><b>${solveRate===null?'—':solveRate+'%'}</b><span>solve rate</span></div>
        </div>
        ${closed.length ? h`<div class="outcome-bar" role="img" aria-label="${solved.length} solved, ${escaped.length} missed it, ${active.length} in progress">
          ${solved.length?`<i style="flex:0 0 ${(solved.length/cases.length*100)}%;background:var(--success)"></i>`:''}
          ${escaped.length?`<i style="flex:0 0 ${(escaped.length/cases.length*100)}%;background:var(--warn)"></i>`:''}
          ${active.length?`<i style="flex:0 0 ${(active.length/cases.length*100)}%;background:var(--accent-2)"></i>`:''}
        </div>
        <div class="outcome-legend">
          <div class="outcome-legend-item"><span class="dot" style="background:var(--success)"></span>Solved <b>${solved.length}</b></div>
          <div class="outcome-legend-item"><span class="dot" style="background:var(--warn)"></span>Missed It <b>${escaped.length}</b></div>
          <div class="outcome-legend-item"><span class="dot" style="background:var(--accent-2)"></span>In progress <b>${active.length}</b></div>
        </div>` : ''}
      </div>`;
    }
    body += `</div>`;

    if(trialCapped()){
      body += h`<div class="banner banner-demo" style="margin-top:16px">${icon('seal')}<span>You've used both of your trial's free case files. <button type="button" data-action="open-upsell" style="background:none;border:none;padding:0;color:var(--gold);text-decoration:underline;cursor:pointer;font:inherit;font-weight:700">Get the full version</button> for unlimited cases.</span></div>`;
    }

    if(cases.length===0){
      body += h`<div class="card" style="margin-top:22px">
        <div class="empty-state">
          ${icon('magnifier')}
          <h3>Ready to start your first case?</h3>
          <p>Pick the book you're reading, name your prime suspect, and see if your instincts hold up to the ending.</p>
          <div class="btn-row" style="justify-content:center">
            <button class="btn btn-primary" data-action="start-wizard">Yes, start my first case</button>
            <button class="btn btn-ghost" data-action="dismiss-cta">Not yet</button>
          </div>
        </div>
      </div>`;
    } else {
      body += h`<div class="section-head"><h2>Active Cases <span class="stamp">(${active.length})</span></h2>${active.length>0?(trialCapped()?`<button class="btn btn-gold" data-action="open-upsell">${icon('seal')} Get the full version</button>`:`<button class="btn btn-primary" data-action="start-wizard">${icon('plus')} New case</button>`):''}</div>`;
      if(active.length===0){
        body += `<div class="card"><div class="empty-state"><p>No open cases — every book you've read has been closed out.</p><div class="btn-row" style="justify-content:center">${trialCapped()?`<button class="btn btn-gold" data-action="open-upsell">${icon('seal')} Get the full version</button>`:`<button class="btn btn-primary" data-action="start-wizard">Start a new case</button>`}</div></div></div>`;
      } else {
        body += `<div class="case-grid">${active.map(caseTileHTML).join('')}</div>`;
      }
      if(closed.length){
        body += h`<div class="section-head"><h2>Closed Cases <span class="stamp">(${closed.length})</span></h2></div>`;
        body += `<div class="case-grid">${closed.map(caseTileHTML).join('')}</div>`;
      }
    }
    return body;
  }

  function statusBadge(c){
    if(c.status==='closed'){
      return c.resolution&&c.resolution.solved
        ? `<span class="badge badge-solved">${icon('check')} solved</span>`
        : `<span class="badge badge-escaped">${icon('ghost')} missed it</span>`;
    }
    if(c.locked) return `<span class="badge badge-locked">locked</span>`;
    return `<span class="badge badge-active">active</span>`;
  }

  function caseTileHTML(c){
    const deleteBtn = h`<button type="button" class="case-tile-delete" data-action="delete-case-tile" data-id="${c.id}" title="Delete case">${icon('trash')}</button>`;
    if(c.status==='closed'){
      const solved = !!(c.resolution && c.resolution.solved);
      return h`<div class="case-tile" data-action="open-case" data-id="${c.id}">
        ${deleteBtn}
        <div class="cover-mini">${coverHTML(c.book&&c.book.title, c.book&&c.book.author,{mini:true, imgUrl:c.coverUrl})}</div>
        <div class="case-tile-body">
          <div class="tile-progress-row">
            <span class="stamp">${c.progress||100}%</span>
            <span class="mini-checkbox ${solved?'is-solved':'is-escaped'}">
              <span class="box">${solved?icon('check'):icon('x')}</span>
              <span>${solved?'Solved':'Missed It'}</span>
            </span>
          </div>
        </div>
      </div>`;
    }
    return h`<div class="case-tile" data-action="open-case" data-id="${c.id}">
      ${deleteBtn}
      <div class="cover-mini">${coverHTML(c.book&&c.book.title, c.book&&c.book.author,{mini:true, imgUrl:c.coverUrl})}</div>
      <div class="case-tile-body">
        <div class="case-tile-title">${escapeHtml((c.book&&c.book.title)||'Untitled')}</div>
        <div class="case-tile-author">${(c.book&&c.book.author)?('by '+escapeHtml(c.book.author)):'&nbsp;'}</div>
        <div class="case-tile-meta">
          <div class="mini-bar"><i style="width:${c.progress||0}%"></i></div>
          <span class="stamp">${c.progress||0}%</span>
        </div>
        ${statusBadge(c)}
      </div>
    </div>`;
  }

  /* ============================== HISTORY ============================== */
  function historyHTML(){
    let body = h`<div class="section-head" style="margin-top:0"><h2>${icon('book')} All Cases</h2><button class="btn btn-ghost" data-action="go-dashboard">${icon('back')} back</button></div>`;
    if(cases.length===0){
      body += `<div class="card"><div class="empty-state"><p>No cases yet.</p></div></div>`;
    } else {
      cases.forEach(ensureCoverForCase);
      body += `<div class="case-grid">${cases.slice().sort(byRecentlyUpdated).map(caseTileHTML).join('')}</div>`;
    }
    return body;
  }

  /* ============================== WIZARD ============================== */
  function newWizard(){
    return { step:1, title:'', author:'', progress:0, primaryName:'', primaryTheory:'', plotTheory:'',
      others:[], draftName:'', draftTheory:'', draftTrust:5, finalName:'', finalTheory:'' };
  }

  // Step 2 (the percentage page) has a plain textarea, not a submitted form,
  // so — like the suspect-board page's syncPrimaryFieldsFromDOM — we pull
  // whatever's typed into it back into wizard state before any action that
  // re-renders or navigates away from step 2, so it isn't lost.
  function syncStep2FromDOM(){
    const el = document.getElementById('w-plot-theory');
    if(el) wizard.plotTheory = el.value;
  }

  function wizardStepCount(){ return wizard.progress>=50 ? 4 : 3; }

  function wizardHTML(){
    const total = wizardStepCount();
    let dots='';
    for(let i=1;i<=total;i++){ dots += `<div class="wstep ${i<wizard.step?'done':''} ${i===wizard.step?'current':''}"></div>`; }
    let inner='';
    if(wizard.step===1) inner=wizardStep1();
    else if(wizard.step===2) inner=wizardStep2();
    else if(wizard.step===3) inner=wizardStep3();
    else if(wizard.step===4) inner=wizardStep6();
    return h`<div class="card pad">
      <div class="wizard-steps">${dots}</div>
      ${inner}
    </div>`;
  }

  function wizardStep1(){
    return h`<div class="wizard-eyebrow">Step 1 of ${wizardStepCount()}</div>
    <div class="wizard-q">What book are you reading?</div>
    <form data-form="w1">
      <div class="field"><label for="w-title">Title</label><input class="input" id="w-title" name="title" required value="${escapeHtml(wizard.title)}" placeholder="e.g. The Silent Patient"></div>
      <div class="field"><label for="w-author">Author <span class="hint">(optional)</span></label><input class="input" id="w-author" name="author" value="${escapeHtml(wizard.author)}" placeholder="e.g. Alex Michaelides"></div>
      <div class="btn-row"><button class="btn btn-primary" type="submit">Continue</button><button class="btn btn-ghost" type="button" data-action="cancel-wizard">Cancel</button></div>
    </form>`;
  }

  function wizardStep2(){
    const opts=[0,25,50,75];
    return h`<div class="wizard-eyebrow">Step 2 of ${wizardStepCount()}</div>
    <div class="wizard-q">Your case file</div>
    <div style="max-width:170px;margin-bottom:22px">${coverHTML(wizard.title, wizard.author)}</div>
    <div class="wizard-q" style="font-size:25.5px">How much of the book have you read so far?</div>
    <div class="choice-row">${opts.map(p=>`<button type="button" class="choice ${wizard.progress===p?'selected':''}" data-action="w-progress" data-val="${p}">${p}%</button>`).join('')}</div>
    <div class="form-divider" style="margin-top:22px"><span>What's Really Going On <span class="hint">(optional)</span></span></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 12px">Not every case comes down to naming one villain &mdash; jot down your working theory now, or add it later from the case page.</p>
    <div class="field"><textarea class="textarea input" id="w-plot-theory" placeholder="What do you think is actually happening?">${escapeHtml(wizard.plotTheory)}</textarea></div>
    <div class="btn-row" style="margin-top:18px"><button class="btn btn-primary" data-action="w-next" ${!hasProgressChoice()?'disabled':''}>Continue</button><button class="btn btn-ghost" data-action="w-back">Back</button></div>`;
  }
  function hasProgressChoice(){ return wizard.progressChosen===true; }

  // The combined suspect-board step re-renders when a reader adds/removes an
  // "other suspect" without submitting the page's main form first — this
  // pulls whatever they've already typed into the prime-suspect fields back
  // into wizard state first, so that re-render doesn't wipe it.
  function syncPrimaryFieldsFromDOM(){
    const nameEl = document.getElementById('w-primary-name');
    const theoryEl = document.getElementById('w-primary-theory');
    if(nameEl) wizard.primaryName = nameEl.value;
    if(theoryEl) wizard.primaryTheory = theoryEl.value;
  }

  // Combined suspect-board page: prime suspect name + theory, plus as many
  // other suspects as the reader wants to add — all on one page instead of
  // three separate one-question-at-a-time prompts.
  function wizardStep3(){
    const list = wizard.others.map((s,i)=>h`<div class="suspect-draft">
        <div><strong>${escapeHtml(s.name)}</strong><div class="theory-preview">${escapeHtml((s.theory||'').slice(0,60))}${(s.theory||'').length>60?'…':''}</div></div>
        <div class="suspect-draft-meta"><span class="trust-label">trust ${s.trust}/10</span><button type="button" class="remove-x" data-action="w-remove-other" data-idx="${i}">${icon('x')}</button></div>
      </div>`).join('');
    return h`<div class="wizard-eyebrow">Step 3 of ${wizardStepCount()}</div>
    <div class="wizard-q">Build your suspect board</div>
    <form data-form="w3">
      <div class="field"><label for="w-primary-name">Who is your number one suspect?</label><input class="input" id="w-primary-name" name="name" required value="${escapeHtml(wizard.primaryName)}" placeholder="e.g. The victim's business partner"></div>
      <div class="field"><label for="w-primary-theory">Why do you suspect them?</label><textarea class="textarea input" id="w-primary-theory" name="theory" required placeholder="Lay out the evidence...">${escapeHtml(wizard.primaryTheory)}</textarea></div>

      <div class="form-divider" style="margin-top:8px"><span>Other Suspects (optional)</span></div>
      ${list ? `<div class="suspect-draft-list">${list}</div>` : `<p style="color:var(--text-faint);font-size:16.5px;margin-bottom:16px">No other suspects yet — add as many as you like, or move on with just your prime suspect.</p>`}
      <div class="field"><label for="w-o-name">Suspect name</label><input class="input" id="w-o-name" name="w-o-name" placeholder="e.g. The neighbor"></div>
      <div class="field"><label for="w-o-theory">Your theory</label><textarea class="textarea input" id="w-o-theory" name="w-o-theory" placeholder="Why do they make the list?"></textarea></div>
      <div class="field">
        <label>Trust — how sure are you? (1&ndash;10)</label>
        <div class="range-row"><input type="range" min="1" max="10" value="5" id="w-o-trust" name="w-o-trust"><span class="trust-value" id="w-o-trust-val">5</span></div>
      </div>
      <button class="btn btn-gold" type="button" data-action="w-add-other">${icon('plus')} Add suspect</button>

      <div class="btn-row" style="margin-top:22px"><button class="btn btn-primary" type="submit">${wizard.progress>=50?'Continue to final suspect':'Finish setup'}</button><button class="btn btn-ghost" type="button" data-action="w-back">Back</button></div>
    </form>`;
  }

  function wizardReviewHTML(){
    const isExisting = wizard.mode==='lock-existing';
    const c = isExisting ? activeCase : null;
    const primaryName = isExisting ? (c.primary?c.primary.name:wizard.primaryName) : wizard.primaryName;
    const primaryTheory = isExisting ? (c.primary?c.primary.theory:wizard.primaryTheory) : wizard.primaryTheory;
    const others = wizard.others || [];

    let out = h`<div class="suspects-head"><h2>${icon('fingerprint')} Suspect Board</h2></div>`;
    let cards = suspectCardHTML({name:primaryName, theory:primaryTheory}, {prime:true, editable:false});
    others.forEach(s=>{ cards += suspectCardHTML(s, {editable:false}); });
    out += `<div class="suspect-grid">${cards}</div>`;

    return out;
  }

  function wizardStep6(){
    const options = [{name:wizard.primaryName, tag:'Prime suspect'}].concat(wizard.others.map(s=>({name:s.name,tag:'trust '+s.trust+'/10'})));
    let out = h`<div class="wizard-eyebrow">Step 4 of ${wizardStepCount()} &middot; Review &amp; final answer</div>
    <div class="wizard-q">You're at 50% — review everything, then lock in your final suspect</div>
    <p style="color:var(--text-dim);font-size:16.5px;margin-bottom:18px;font-family:var(--font-type)">Here's everything logged on this case so far. Take one more look before you decide &mdash; once locked, no more suspects or theories can be added or changed.</p>`;
    out += wizardReviewHTML();
    out += h`<div class="suspects-head" style="margin-top:38px"><h2>${icon('seal')} Lock In Your Final Suspect</h2></div>
    <div class="choice-row" style="flex-direction:column">
      ${options.map(o=>h`<label class="choice" style="text-align:left;display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="radio" name="finalpick" value="${escapeHtml(o.name)}" ${wizard.finalName===o.name?'checked':''} data-action="w-final-pick" style="accent-color:var(--accent-2)">
        <span style="font-family:var(--font-display);font-size:18.5px">${escapeHtml(o.name)}</span>
        <span class="stamp" style="margin-left:auto">${o.tag}</span>
      </label>`).join('')}
      <label class="choice" style="text-align:left;display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="radio" name="finalpick" value="__other__" ${wizard.finalName==='__other__'?'checked':''} data-action="w-final-pick" style="accent-color:var(--accent-2)">
        <span style="font-family:var(--font-display);font-size:18.5px">Someone new</span>
      </label>
    </div>
    <form data-form="w6" style="margin-top:14px">
      ${wizard.finalName==='__other__' ? `<div class="field"><label for="w6-name">New suspect name</label><input class="input" id="w6-name" name="othername" value="${escapeHtml(wizard.finalOtherName||'')}" required></div>` : ''}
      <div class="field"><label for="w6-theory">Final theory</label><textarea class="textarea input" id="w6-theory" name="theory" required placeholder="Make your case.">${escapeHtml(wizard.finalTheory)}</textarea></div>
      <div class="btn-row"><button class="btn btn-primary" type="submit">Lock it in</button><button class="btn btn-ghost" type="button" data-action="w-back">Back</button></div>
    </form>`;
    return out;
  }

  /* ============================== CASE DETAIL ============================== */
  function caseHTML(){
    const c = activeCase;
    if(!c) return `<div class="card pad"><p>Case not found.</p></div>`;
    ensureCoverForCase(c);
    const marks=[0,25,50,75,100];
    const closed = c.status==='closed';
    const locked = !!c.locked;

    let out = h`<div class="btn-row" style="margin-bottom:16px;justify-content:space-between">
      <button class="btn btn-ghost" data-action="go-dashboard">${icon('back')} All cases</button>
      <button class="btn btn-ghost" data-action="view-summary">${icon('book')} View Summary</button>
    </div>`;

    if(closed){
      const v = buildVerdict(c, c.resolution.actualCulprit);
      out += h`<div class="resolution-banner ${v.solved?'solved':'escaped'}">
        <div class="verdict-icon">${icon(v.solved?'check':'ghost')}</div>
        <h2>${v.solved?'Case Closed: Solved':'The Suspect Got Away'}</h2>
        <p>${v.solved? 'Your final suspect matched the book\'s ending.' : 'Your final suspect wasn\'t the one — the real culprit was '+escapeHtml(c.resolution.actualCulprit)+'.'}</p>
      </div>`;
    }

    out += h`<div class="case-header">
      <div style="display:flex;flex-direction:column;gap:8px;width:150px;flex:none">
        <div class="cover">${coverHTML(c.book.title, c.book.author, {imgUrl:c.coverUrl})}</div>
        ${coverEditOpen ? h`
          <div style="display:flex;flex-direction:column;gap:6px">
            <label class="btn btn-ghost" style="padding:6px 8px;font-size:13px;text-align:center;cursor:pointer">
              ${icon('plus')} Upload a JPG
              <input type="file" id="cover-file-input" accept="image/jpeg,.jpg,.jpeg" style="display:none">
            </label>
            <div style="font-size:11.5px;color:var(--text-faint);text-align:center">Resized to a thumbnail automatically</div>
            ${coverUploadError ? `<div style="font-size:12px;color:var(--warn-2)">${escapeHtml(coverUploadError)}</div>` : ''}
            <button class="btn btn-ghost" type="button" data-action="toggle-cover-edit" style="padding:6px 8px;font-size:13px">Cancel</button>
          </div>
        ` : h`
          <button type="button" class="btn btn-ghost" data-action="toggle-cover-edit" style="padding:6px 8px;font-size:13px">${icon('link')} ${c.coverManual?'Change cover':'Add custom cover'}</button>
          ${!(c.coverManual && !c.coverUrl) ? `<button type="button" class="btn btn-ghost" data-action="use-generic-cover" style="padding:6px 8px;font-size:13px">Use generic cover</button>` : ''}
          ${c.coverManual ? `<button type="button" class="btn btn-ghost" data-action="reset-cover" style="padding:6px 8px;font-size:13px">Use auto lookup</button>` : ''}
        `}
      </div>
      <div class="case-header-info">
        <div class="case-header-title">${escapeHtml(c.book.title)}</div>
        ${c.book.author?`<div class="case-header-author">by ${escapeHtml(c.book.author)}</div>`:''}
        <div class="case-header-badges">${statusBadge(c)}<span class="badge">started ${fmtDate(c.createdAt)}</span></div>
        <button class="btn btn-danger" data-action="delete-case" style="align-self:flex-start;margin-top:6px">${icon('trash')} Delete case</button>
      </div>
    </div>`;

    out += h`<div class="settings-row" style="margin-top:16px">
      <div class="settings-row-text"><b>${icon('star')} Rate This Book</b><span>${c.rating?`You rated it ${c.rating}/5.`:'How would you rate it overall, 1&ndash;5?'}</span></div>
      <div class="rating-row">
        ${[1,2,3,4,5].map(n=>`<button type="button" class="rating-star ${c.rating>=n?'filled':''}" data-action="set-rating" data-val="${n}" title="${n} star${n>1?'s':''}">${icon('star')}</button>`).join('')}
        ${c.rating?`<button type="button" class="btn btn-ghost" data-action="clear-rating" style="margin-left:8px;padding:6px 12px;font-size:13px">Clear</button>`:''}
      </div>
    </div>`;

    out += h`<div class="rail">
      <div class="rail-track"><div class="rail-fill" style="width:${c.progress}%"></div></div>
      <div class="rail-marks">
        ${marks.map(m=>{
          const reached = c.progress>=m;
          const isCurrent = c.progress===m;
          const disabled = locked || closed || (m===100);
          return `<button type="button" class="rail-mark ${reached?'reached':''} ${isCurrent?'current':''}" ${disabled?'disabled':''} data-action="set-progress" data-val="${m}"><span class="dot"></span><span>${m}%</span></button>`;
        }).join('')}
      </div>
    </div>`;

    if(!closed && locked){
      out += h`<div class="btn-row" style="margin-top:18px;justify-content:center">
        <button class="btn btn-primary" data-action="open-resolve">${icon('seal')} I finished the book — close the case</button>
      </div>`;
    }

    out += h`<div class="suspects-head"><h2>${icon('fingerprint')} Suspect Board</h2>${!locked&&!closed?`<button class="btn btn-gold" data-action="open-add-suspect">${icon('plus')} Add suspect</button>`:''}</div>`;

    let cards = '';
    if(c.primary){
      cards += suspectCardHTML(c.primary, {prime:true, isFinal: c.finalSuspect && namesMatch(c.finalSuspect.name,c.primary.name), editable: !locked && !closed, index:-1});
    }
    (c.suspects||[]).forEach((s,i)=>{
      cards += suspectCardHTML(s, {isFinal: c.finalSuspect && namesMatch(c.finalSuspect.name,s.name), editable: !locked && !closed, index:i});
    });
    out += `<div class="suspect-grid">${cards}</div>`;

    out += plotTheorySectionHTML(c, !closed);
    out += twistsSectionHTML(c, !closed);
    out += journalSectionHTML(c, !closed);

    if(!locked && !closed){
      out += h`<div class="lock-note">At 50% you'll be asked to name your final suspect. After that, the board locks — no edits, no new names.</div>`;
    }

    if(c.finalSuspect){
      out += h`<div class="final-panel">
        <div class="seal-stamp">${closed?'closed':'locked'}</div>
        <div class="suspect-tag">Final Suspect</div>
        <div class="suspect-name" style="font-size:29.5px">${escapeHtml(c.finalSuspect.name)}</div>
        <div class="suspect-theory" style="font-size:17px">${escapeHtml(c.finalSuspect.theory)}</div>
        <div class="stamp" style="margin-top:10px">locked ${fmtDate(c.finalSuspect.lockedAt)}</div>
      </div>`;

      out += h`<div class="settings-row" style="margin-top:16px">
        <div class="settings-row-text"><b>${icon('link')} Community Board</b><span>Make your final suspect and theory visible to other readers of this book, so you can compare notes. Heads up: it's a two-way street &mdash; other readers' theories may include spoilers, especially from closed cases.</span></div>
        <div class="choice-row" style="flex:none;margin-bottom:0">
          <button type="button" class="choice ${c.public?'selected':''}" data-action="toggle-public" data-val="true" style="flex:none;padding:8px 16px;font-size:15px">Public</button>
          <button type="button" class="choice ${!c.public?'selected':''}" data-action="toggle-public" data-val="false" style="flex:none;padding:8px 16px;font-size:15px">Private</button>
        </div>
      </div>
      ${communityBoardError ? `<div class="banner banner-warn" style="margin-top:12px">${icon('warn')}<span>${escapeHtml(communityBoardError)}</span></div>` : ''}
      <div class="btn-row" style="margin-top:14px">
        <button class="btn btn-gold" type="button" data-action="view-community">${icon('book')} View Community Board</button>
      </div>`;
    }

    if(closed){
      const v = buildVerdict(c, c.resolution.actualCulprit);
      out += h`<div class="verdict-cols">
        <div class="verdict-col strengths"><h4>${icon('check')} Strengths</h4><ul>${v.strengths.map(s=>`<li>${s}</li>`).join('')}</ul></div>
        <div class="verdict-col weaknesses"><h4>${icon('warn')} Weaknesses</h4><ul>${v.weaknesses.map(s=>`<li>${s}</li>`).join('')}</ul></div>
      </div>
      <div class="stat-row">
        <div class="stat-chip"><b>${v.stats.totalConsidered}</b><span>suspects considered</span></div>
        <div class="stat-chip"><b>${v.stats.avgTrust}</b><span>avg. trust score</span></div>
        <div class="stat-chip"><b>${v.stats.stayedWithPrime?'Yes':'No'}</b><span>stayed w/ first pick</span></div>
      </div>
      <div class="stat-row">
        <div class="stat-chip"><b>${v.stats.cluesFound}</b><span>clues found</span></div>
        <div class="stat-chip"><b>${v.stats.liesDetected}</b><span>lies detected</span></div>
        <div class="stat-chip"><b>${v.stats.connectionsMade}</b><span>connections made</span></div>
        <div class="stat-chip"><b>${v.stats.totalTwists}</b><span>twists predicted</span></div>
      </div>`;
    }

    return out;
  }

  function summaryHTML(){
    const c = activeCase;
    if(!c) return `<div class="card pad"><p>Case not found.</p></div>`;
    const closed = c.status==='closed';
    const others = c.suspects||[];
    const twists = c.twists||[];
    const journal = (c.journal||[]).slice().reverse();

    let out = h`<div class="btn-row no-print" style="margin-bottom:16px;justify-content:space-between">
      <button class="btn btn-ghost" data-action="back-to-case">${icon('back')} Back to case</button>
      <button class="btn btn-gold" data-action="print-summary">${icon('seal')} Print / Save as PDF</button>
    </div>
    <div class="suspects-head"><h2>${icon('book')} Case Summary</h2></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 18px">Everything logged for <b>${escapeHtml(c.book.title)}</b>${c.book.author?' by '+escapeHtml(c.book.author):''}, in one place.</p>`;

    out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('fingerprint')} Case File</h2></div>
    <ul class="summary-list">
      <li>Title: ${escapeHtml(c.book.title)}</li>
      ${c.book.author?`<li>Author: ${escapeHtml(c.book.author)}</li>`:''}
      <li>Status: ${closed?'Closed':(c.locked?'Locked':'Active')}</li>
      <li>Progress: ${c.progress||0}% read</li>
      <li>Started: ${fmtDate(c.createdAt)}</li>
      <li>Last updated: ${fmtDate(c.updatedAt)}</li>
      <li>Rating: ${c.rating?c.rating+'/5':'Not yet rated'}</li>
      <li>Community Board: ${c.public?'Public':'Private'}</li>
    </ul>`;

    out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('fingerprint')} Suspect Board</h2></div>`;
    if(c.primary || others.length || c.finalSuspect){
      let items = '';
      if(c.primary) items += `<li>Prime Suspect &mdash; ${escapeHtml(c.primary.name)}: ${escapeHtml(c.primary.theory||'No theory entered.')}</li>`;
      others.forEach(s=>{ items += `<li>Suspect &mdash; ${escapeHtml(s.name)} (trust ${s.trust}/10): ${escapeHtml(s.theory||'No theory entered.')}</li>`; });
      if(c.finalSuspect) items += `<li>Final Suspect &mdash; ${escapeHtml(c.finalSuspect.name)}: ${escapeHtml(c.finalSuspect.theory||'')} <span style="color:var(--text-faint)">(locked ${fmtDate(c.finalSuspect.lockedAt)})</span></li>`;
      out += `<ul class="summary-list">${items}</ul>`;
    } else {
      out += `<ul class="summary-list"><li>No suspects entered yet.</li></ul>`;
    }

    out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('ghost')} What's Really Going On</h2></div>
    <ul class="summary-list"><li>${c.plotTheory ? escapeHtml(c.plotTheory) : 'No working theory entered.'}</li></ul>`;

    out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('warn')} Predicted Twists</h2></div>`;
    if(twists.length){
      out += `<ul class="summary-list">${twists.map(tw=>`<li>${escapeHtml(tw)}</li>`).join('')}</ul>`;
    } else {
      out += `<ul class="summary-list"><li>No twists predicted.</li></ul>`;
    }

    out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('magnifier')} Clues Found</h2></div>`;
    if(journal.length){
      out += `<ul class="summary-list">${journal.map(e=>{
        const meta = JOURNAL_TYPES[e.type] || JOURNAL_TYPES.clue;
        return `<li>${meta.label} &mdash; ${escapeHtml(e.text)}</li>`;
      }).join('')}</ul>`;
    } else {
      out += `<ul class="summary-list"><li>Nothing logged yet.</li></ul>`;
    }

    if(closed && c.resolution){
      const v = buildVerdict(c, c.resolution.actualCulprit);
      out += h`<div class="suspects-head" style="margin-top:28px"><h2>${icon('seal')} Verdict</h2></div>
      <ul class="summary-list">
        <li>Actual culprit: ${escapeHtml(c.resolution.actualCulprit||'')}</li>
        <li>Outcome: ${v.solved?'Solved':'Missed It'}</li>
        <li>Closed: ${fmtDate(c.resolution.closedAt)}</li>
        <li>Suspects considered: ${v.stats.totalConsidered}</li>
        <li>Average trust score: ${v.stats.avgTrust}</li>
        <li>Stayed with first pick: ${v.stats.stayedWithPrime?'Yes':'No'}</li>
        <li>Clues found: ${v.stats.cluesFound}</li>
        <li>Lies detected: ${v.stats.liesDetected}</li>
        <li>Connections made: ${v.stats.connectionsMade}</li>
        <li>Twists predicted: ${v.stats.totalTwists}</li>
        ${v.strengths.map(s=>`<li class="sub">Strength: ${s}</li>`).join('')}
        ${v.weaknesses.map(s=>`<li class="sub">Weakness: ${s}</li>`).join('')}
      </ul>`;
    }

    return out;
  }

  function suspectCardHTML(s, opts){
    opts=opts||{};
    const trust = opts.prime ? null : s.trust;
    let dots='';
    if(trust!=null){
      for(let i=1;i<=10;i++){ dots+=`<i class="${i<=trust?'on':''}"></i>`; }
    }
    return h`<div class="suspect-card ${opts.prime?'prime':''} ${opts.isFinal?'final':''}">
      ${opts.editable ? `<div class="suspect-card-actions"><button class="remove-x" data-action="remove-suspect" data-index="${opts.index}" title="Remove">${icon('x')}</button></div>` : ''}
      <span class="suspect-tag">${opts.prime?'Prime Suspect':(opts.isFinal?'Also Final Pick':'Suspect')}</span>
      <div class="suspect-name">${escapeHtml(s.name)}</div>
      <div class="suspect-theory">${escapeHtml(s.theory)}</div>
      ${trust!=null?`<div class="suspect-trust"><div class="trust-dots">${dots}</div><span class="trust-label">${trust}/10</span></div>`:''}
    </div>`;
  }

  /* ============================== PLOT THEORY & TWISTS ============================== */
  function plotTheorySectionHTML(c, editable){
    const val = c.plotTheory || '';
    let out = h`<div class="suspects-head" style="margin-top:38px"><h2>${icon('ghost')} What's Really Going On</h2></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 12px">Not every case comes down to naming one villain &mdash; what do you think is actually happening? A conspiracy? A frame job? An unreliable narrator? Twins? Lay it out here, separate from your suspect board.</p>`;
    if(editable){
      out += h`<form data-form="plot-theory">
        <div class="field"><textarea class="textarea input" name="plotTheory" placeholder="What do you think is actually happening?">${escapeHtml(val)}</textarea></div>
        <div class="btn-row"><button class="btn btn-gold" type="submit">Save theory</button></div>
      </form>`;
    } else {
      out += val ? `<div class="theory-box">${escapeHtml(val)}</div>` : `<div class="theory-box empty">No working theory entered.</div>`;
    }
    return out;
  }

  function twistsSectionHTML(c, editable){
    const twists = c.twists || [];
    let out = h`<div class="suspects-head" style="margin-top:38px"><h2>${icon('warn')} Predicted Twists</h2></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 12px">Call up to three twists before the book calls them for you.</p>`;
    if(twists.length){
      out += `<div class="twist-grid">${twists.map((tw,i)=>{
        return h`<div class="twist-item"><span class="twist-num">${i+1}</span><span class="twist-text">${escapeHtml(tw)}</span>${editable?`<button type="button" class="remove-x" data-action="remove-twist" data-index="${i}" title="Remove">${icon('x')}</button>`:''}</div>`;
      }).join('')}</div>`;
    } else if(!editable){
      out += `<div class="theory-box empty">No twists called.</div>`;
    }
    if(editable && twists.length<3){
      out += h`<form data-form="add-twist" style="margin-top:14px">
        <div class="field"><textarea class="textarea input" name="twist" required placeholder="e.g. The narrator has been the killer's accomplice all along"></textarea></div>
        <button class="btn btn-gold" type="submit">${icon('plus')} Add twist (${twists.length}/3)</button>
      </form>`;
    }
    return out;
  }

  /* ============================== CLUES FOUND JOURNAL ============================== */
  const JOURNAL_TYPES = {
    clue:{label:'Clue Found', icon:'magnifier', color:'var(--accent-2)'},
    lie:{label:'Lie Detected', icon:'warn', color:'var(--warn-2)'},
    connection:{label:'Connection Made', icon:'link', color:'var(--gold)'}
  };

  function journalSectionHTML(c, editable){
    const entries = (c.journal || []).slice().reverse();
    const filter = journalFilter;
    const filtered = filter==='all' ? entries : entries.filter(e=>e.type===filter);

    let out = h`<div class="suspects-head" style="margin-top:38px"><h2>${icon('magnifier')} Clues Found</h2></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 12px">Log what you notice as you read &mdash; real clues, lies you catch, and connections between suspects or events.</p>`;

    if(entries.length){
      out += `<div class="choice-row" style="margin-bottom:14px">${['all','clue','lie','connection'].map(f=>`<button type="button" class="choice ${filter===f?'selected':''}" data-action="journal-filter" data-val="${f}" style="flex:none;padding:8px 14px;font-size:14px">${f==='all'?'All':JOURNAL_TYPES[f].label}</button>`).join('')}</div>`;
    }

    if(filtered.length){
      out += `<div class="twist-grid">${filtered.map(e=>{
        const meta = JOURNAL_TYPES[e.type] || JOURNAL_TYPES.clue;
        return h`<div class="twist-item">
          <span class="twist-num" style="color:${meta.color}">${icon(meta.icon)}</span>
          <span class="twist-text"><span class="stamp" style="color:${meta.color}">${meta.label}</span><br>${escapeHtml(e.text)}</span>
          ${editable?`<button type="button" class="remove-x" data-action="remove-journal" data-id="${e.id}" title="Remove">${icon('x')}</button>`:''}
        </div>`;
      }).join('')}</div>`;
    } else {
      out += `<div class="theory-box empty">${entries.length ? 'Nothing logged in this category yet.' : 'Nothing logged yet.'}</div>`;
    }

    if(editable){
      out += h`<form data-form="add-journal" style="margin-top:14px">
        <div class="choice-row" style="margin-bottom:10px">${['clue','lie','connection'].map(t=>`<button type="button" class="choice ${journalDraftType===t?'selected':''}" data-action="journal-type" data-val="${t}">${JOURNAL_TYPES[t].label}</button>`).join('')}</div>
        <div class="field"><textarea class="textarea input" name="entry" required placeholder="What did you notice?"></textarea></div>
        <button class="btn btn-gold" type="submit">${icon('plus')} Add to journal</button>
      </form>`;
    }
    return out;
  }

  /* ============================== SETTINGS ============================== */
  function settingsHTML(){
    return h`<button class="btn btn-ghost" data-action="go-dashboard" style="margin-bottom:16px">${icon('back')} Back</button>
    <div class="card pad">
      <h2 style="font-size:23.5px;margin-bottom:18px">${icon('gear')} Account</h2>
      <div class="settings-row"><div class="settings-row-text"><b>Email</b><span>${escapeHtml(profile.email)}</span></div></div>
      <div class="settings-row"><div class="settings-row-text"><b>Name</b><span>${escapeHtml(profile.displayName)}</span></div></div>
      <div class="settings-row"><div class="settings-row-text"><b>Member since</b><span>${fmtDate(profile.createdAt)}</span></div></div>
      <div class="settings-row"><div class="settings-row-text"><b>Storage</b><span>${mode==='cloud'?'Synced to your Firebase project (permanent, cross-device)':'This browser only (local)'}</span></div></div>
      ${mode==='cloud' ? `<div class="settings-row"><div class="settings-row-text"><b>Log out</b><span>Sign out of this account on this device.</span></div><button class="btn" data-action="logout">Log out</button></div>` : ''}
    </div>
    <div class="card pad" style="margin-top:16px;border-color:var(--warn-dim)">
      <h2 style="font-size:23.5px;margin-bottom:6px;color:var(--warn-2)">${icon('warn')} Danger Zone</h2>
      <p style="color:var(--text-dim);font-size:16.5px;margin-bottom:18px">Your data stays permanent until you deactivate or cancel your account.</p>
      <div class="settings-row"><div class="settings-row-text"><b>Deactivate account</b><span>Hide your cases and pause the account. Reversible.</span></div><button class="btn" data-action="open-deactivate">Deactivate</button></div>
      <div class="settings-row"><div class="settings-row-text"><b>Cancel &amp; delete everything</b><span>Permanently erase your account and every case file.</span></div><button class="btn btn-danger" data-action="open-delete">Delete</button></div>
    </div>`;
  }

  /* ============================== MODALS ============================== */
  function modalWrapHTML(m){
    return `<div class="modal-overlay" data-action="modal-overlay">${m}</div>`;
  }
  function closeModal(){ modal=null; render(); }

  function resolveModalHTML(){
    return h`<div class="card modal">
      <h3>${icon('seal')} Close the Case</h3>
      <div class="modal-sub">You've finished the book. Who was really behind it? We'll check it against your final suspect.</div>
      <form data-form="resolve">
        <div class="field"><label for="rv-culprit">The real culprit was...</label><input class="input" id="rv-culprit" name="culprit" required placeholder="Enter the actual culprit's name"></div>
        <div class="btn-row"><button class="btn btn-primary" type="submit">${icon('check')} Reveal the verdict</button><button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button></div>
      </form>
    </div>`;
  }

  function addSuspectModalHTML(){
    return h`<div class="card modal">
      <h3>${icon('fingerprint')} Add a Suspect</h3>
      <div class="modal-sub">Who else belongs on the board?</div>
      <form data-form="add-suspect">
        <div class="field"><label for="as-name">Name</label><input class="input" id="as-name" name="name" required></div>
        <div class="field"><label for="as-theory">Theory</label><textarea class="textarea input" id="as-theory" name="theory" required></textarea></div>
        <div class="field"><label>Trust (1&ndash;10)</label><div class="range-row"><input type="range" min="1" max="10" value="5" id="as-trust" name="trust"><span class="trust-value" id="as-trust-val">5</span></div></div>
        <div class="btn-row"><button class="btn btn-primary" type="submit">${icon('plus')} Add to board</button><button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button></div>
      </form>
    </div>`;
  }

  function confirmModalHTML(opts){
    if(!opts.word){
      return h`<div class="card modal">
        <h3>${icon('warn')} ${escapeHtml(opts.title)}</h3>
        <div class="modal-sub">${opts.body}</div>
        <div class="btn-row"><button type="button" class="btn btn-danger" data-action="confirm-simple">${escapeHtml(opts.confirmLabel)}</button><button class="btn btn-ghost" type="button" data-action="close-modal">No</button></div>
      </div>`;
    }
    return h`<div class="card modal">
      <h3>${icon('warn')} ${escapeHtml(opts.title)}</h3>
      <div class="modal-sub">${opts.body}</div>
      <form data-form="confirm-typed" data-word="${opts.word}">
        <div class="field"><label>Type <b style="color:var(--text)">${opts.word}</b> to confirm</label><input class="input" id="cf-typed" required autocomplete="off"></div>
        <div class="btn-row"><button class="btn btn-danger" type="submit">${escapeHtml(opts.confirmLabel)}</button><button class="btn btn-ghost" type="button" data-action="close-modal">Cancel</button></div>
      </form>
    </div>`;
  }

  function upsellModalHTML(){
    return h`<div class="card modal">
      <h3>${icon('seal')} You've used your trial</h3>
      <div class="modal-sub">This trial version covers ${TRIAL_CASE_LIMIT} case files, and both are used. The full version has no case limit &mdash; same wizard, same verdicts, same Community Board, everything, with unlimited case files.</div>
      <div class="btn-row"><button class="btn btn-ghost" type="button" data-action="close-modal">Maybe later</button></div>
    </div>`;
  }

  /* ============================== ACTIONS ============================== */
  async function openCase(id){
    activeCaseId = id;
    activeCase = await DAL.getCase(id);
    coverEditOpen = false;
    coverUploadError = '';
    view='case'; render();
  }

  function bind(){
    app.querySelectorAll('input[type=range]').forEach(r=>{
      r.addEventListener('input', ()=>{
        const val = document.getElementById(r.id+'-val');
        if(val) val.textContent = r.value;
      });
    });
    // keep in-progress typing alive across a step-6 re-render triggered by a radio pick
    const w6theory = document.getElementById('w6-theory');
    if(w6theory) w6theory.addEventListener('input', ()=>{ wizard.finalTheory = w6theory.value; });
    const w6other = document.getElementById('w6-name');
    if(w6other) w6other.addEventListener('input', ()=>{ wizard.finalOtherName = w6other.value; });
    // On the combined suspect-board step, the "other suspect" name field sits
    // in the same <form> as the page's main Continue/Finish submit button —
    // pressing Enter there should add that suspect, not submit the whole page.
    const woName = document.getElementById('w-o-name');
    if(woName) woName.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'){ e.preventDefault(); handleAction('w-add-other', null, e); }
    });
    const coverFileInput = document.getElementById('cover-file-input');
    if(coverFileInput) coverFileInput.addEventListener('change', async ()=>{
      const file = coverFileInput.files && coverFileInput.files[0];
      if(!file) return;
      coverUploadError = '';
      try{
        const dataUrl = await coverFileToThumbnail(file);
        await setCustomCover(dataUrl, 'upload');
      }catch(e){
        coverUploadError = (e && e.message) || 'Could not use that image.';
        render();
      }
    });
  }

  // Delegated listeners are attached ONCE below (outside render/bind) since
  // #app itself is never replaced, only its innerHTML.
  function onClick(e){
    const t = e.target.closest('[data-action]');
    if(!t) return;
    handleAction(t.dataset.action, t, e);
  }
  function onSubmit(e){
    const form = e.target.closest('form[data-form]');
    if(!form) return;
    e.preventDefault();
    handleSubmit(form);
  }
  function onChange(e){
    const r = e.target.closest('[data-action="w-final-pick"]');
    if(r){ wizard.finalName = r.value; render(); }
  }

  async function handleAction(action, t, e){
    if(action==='modal-overlay' && e.target===t){ closeModal(); return; }
    if(action==='close-modal'){ closeModal(); return; }
    if(action==='go-dashboard'){
      if(profile && profile.status==='deactivated'){ view='deactivated'; render(); return; }
      cases = await DAL.listCases(); view='dashboard'; render(); return;
    }
    if(action==='go-history'){ cases = await DAL.listCases(); view='history'; render(); return; }
    if(action==='go-settings'){ view='settings'; render(); return; }
    if(action==='dismiss-cta'){ /* no-op, stays on dashboard */ return; }
    if(action==='toggle-auth-mode'){ authScreenMode = authScreenMode==='login' ? 'signup' : 'login'; authError=''; render(); return; }
    if(action==='logout'){ await handleLogout(); return; }
    if(action==='start-wizard'){
      if(trialCapped()){ modal='upsell'; render(); return; }
      wizard=newWizard(); view='wizard'; render(); return;
    }
    if(action==='open-upsell'){ modal='upsell'; render(); return; }
    if(action==='cancel-wizard'){
      wizard=null;
      view = (activeCase ? 'case' : 'dashboard');
      render(); return;
    }
    if(action==='w-back'){
      syncStep2FromDOM();
      if(wizard.mode==='lock-existing'){
        if(wizard.step<=4){ wizard=null; view='case'; render(); return; }
        wizard.step -= 1; render(); return;
      }
      if(wizard.step===1){ wizard=null; view='dashboard'; }
      else wizard.step -= 1;
      render(); return;
    }
    if(action==='w-progress'){ syncStep2FromDOM(); wizard.progress = Number(t.dataset.val); wizard.progressChosen=true; render(); return; }
    if(action==='w-next'){ syncStep2FromDOM(); wizard.step=3; render(); return; }
    if(action==='w-remove-other'){ syncPrimaryFieldsFromDOM(); wizard.others.splice(Number(t.dataset.idx),1); render(); return; }
    if(action==='w-add-other'){
      syncPrimaryFieldsFromDOM();
      const nameEl = document.getElementById('w-o-name');
      const theoryEl = document.getElementById('w-o-theory');
      const trustEl = document.getElementById('w-o-trust');
      const oName = ((nameEl&&nameEl.value)||'').trim();
      const oTheory = ((theoryEl&&theoryEl.value)||'').trim();
      if(!oName || !oTheory) return;
      const oTrust = clamp(Number(trustEl&&trustEl.value)||5,1,10);
      wizard.others.push({name:oName, theory:oTheory, trust:oTrust});
      render();
      return;
    }
    if(action==='w-finish'){ await finishWizard(); return; }
    if(action==='w-final-pick'){ /* handled on change below */ return; }
    if(action==='open-case'){ await openCase(t.dataset.id); return; }
    if(action==='set-progress'){ await setProgress(Number(t.dataset.val)); return; }
    if(action==='open-resolve'){ modal='resolve'; render(); return; }
    if(action==='open-add-suspect'){ modal='add-suspect'; render(); return; }
    if(action==='remove-suspect'){ await removeSuspect(Number(t.dataset.index)); return; }
    if(action==='remove-twist'){ await removeTwist(Number(t.dataset.index)); return; }
    if(action==='journal-filter'){ journalFilter = t.dataset.val; render(); return; }
    if(action==='journal-type'){ journalDraftType = t.dataset.val; render(); return; }
    if(action==='remove-journal'){ await removeJournalEntry(t.dataset.id); return; }
    if(action==='toggle-public'){ await setCasePublic(t.dataset.val==='true'); return; }
    if(action==='view-community'){ await openCommunity(); return; }
    if(action==='view-summary'){ view='summary'; render(); return; }
    if(action==='print-summary'){ window.print(); return; }
    if(action==='back-to-case'){ view='case'; render(); return; }
    if(action==='set-rating'){ await setRating(Number(t.dataset.val)); return; }
    if(action==='clear-rating'){ await setRating(0); return; }
    if(action==='delete-case'){ modal={type:'confirm', kind:'delete-case', title:'Are you sure you want to delete?', body:'This permanently removes the case file and everything on it. This can\'t be undone.', confirmLabel:'Yes'}; render(); return; }
    if(action==='toggle-cover-edit'){ coverEditOpen = !coverEditOpen; coverUploadError=''; render(); return; }
    if(action==='reset-cover'){ await resetCover(); return; }
    if(action==='use-generic-cover'){ await useGenericCover(); return; }
    if(action==='delete-case-tile'){ modal={type:'confirm', kind:'delete-case-tile', id:t.dataset.id, title:'Are you sure you want to delete?', body:'This permanently removes the case file and everything on it. This can\'t be undone.', confirmLabel:'Yes'}; render(); return; }
    if(action==='confirm-simple'){ await handleConfirmedAction(); return; }
    if(action==='open-deactivate'){ modal={type:'confirm', kind:'deactivate', title:'Deactivate your account?', body:'Your cases stay safe, but you\'ll be signed out until you reactivate.', word:'DEACTIVATE', confirmLabel:'Deactivate'}; render(); return; }
    if(action==='open-delete'){ modal={type:'confirm', kind:'delete-account', title:'Delete everything?', body:'This permanently erases your account and every case file. There is no undo.', word:'DELETE', confirmLabel:'Delete everything'}; render(); return; }
    if(action==='reactivate'){ await DAL.updateProfile({status:'active'}); profile.status='active'; cases=await DAL.listCases(); view='dashboard'; render(); return; }
  }

  async function handleSubmit(form){
    const fd = new FormData(form);
    const type = form.dataset.form;

    if(type==='signup'){
      const email = (fd.get('email')||'').toString().trim();
      const password = (fd.get('password')||'').toString();
      const name = (fd.get('name')||'').toString().trim();
      const bookTitle = (fd.get('bookTitle')||'').toString().trim();
      const bookAuthor = (fd.get('bookAuthor')||'').toString().trim();
      if(!email||!name||!bookTitle) return;
      if(mode==='cloud' && !password) return;

      authError = '';
      if(mode==='cloud'){
        try{
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          uid = cred.user.uid;
          profileRef = db.collection('users').doc(uid);
          casesRef = profileRef.collection('cases');
        }catch(e){
          authError = firebaseErrorMessage(e);
          render(); return;
        }
      }

      profile = {email, displayName:name, createdAt:new Date().toISOString(), status:'active'};
      await DAL.setProfile(profile);
      cases = [];
      // Straight into building the case they just named — no detour through
      // the dashboard or a redundant "ready to start?" prompt.
      wizard = newWizard();
      wizard.title = bookTitle;
      wizard.author = bookAuthor;
      wizard.step = 2;
      view='wizard'; render(); return;
    }
    if(type==='login'){
      const email = (fd.get('email')||'').toString().trim();
      const password = (fd.get('password')||'').toString();
      if(!email||!password) return;
      authError = '';
      try{
        const cred = await auth.signInWithEmailAndPassword(email, password);
        uid = cred.user.uid;
        profileRef = db.collection('users').doc(uid);
        casesRef = profileRef.collection('cases');
        profile = await DAL.getProfile();
        if(profile && profile.status==='deactivated'){ view='deactivated'; render(); return; }
        cases = await DAL.listCases();
        view='dashboard'; render(); return;
      }catch(e){
        authError = firebaseErrorMessage(e);
        render(); return;
      }
    }
    if(type==='w1'){
      wizard.title=(fd.get('title')||'').toString().trim();
      wizard.author=(fd.get('author')||'').toString().trim();
      if(!wizard.title) return;
      wizard.step=2; render(); return;
    }
    if(type==='w3'){
      wizard.primaryName=(fd.get('name')||'').toString().trim();
      wizard.primaryTheory=(fd.get('theory')||'').toString().trim();
      if(!wizard.primaryName || !wizard.primaryTheory) return;
      await finishWizard();
      return;
    }
    if(type==='w6'){
      let name = wizard.finalName;
      if(name==='__other__'){ name=(fd.get('othername')||'').toString().trim(); }
      const theory=(fd.get('theory')||'').toString().trim();
      if(!name||!theory) return;
      wizard.finalTheory=theory; wizard.finalOtherName=name;
      await finishWizard(name, theory);
      return;
    }
    if(type==='resolve'){
      const culprit=(fd.get('culprit')||'').toString().trim();
      if(!culprit) return;
      await resolveCase(culprit);
      return;
    }
    if(type==='add-suspect'){
      const name=(fd.get('name')||'').toString().trim();
      const theory=(fd.get('theory')||'').toString().trim();
      const trust=clamp(Number(fd.get('trust'))||5,1,10);
      if(!name||!theory) return;
      await addSuspectToCase(name,theory,trust);
      return;
    }
    if(type==='plot-theory'){
      const val=(fd.get('plotTheory')||'').toString().trim();
      await savePlotTheory(val);
      return;
    }
    if(type==='add-twist'){
      const val=(fd.get('twist')||'').toString().trim();
      if(!val) return;
      await addTwist(val);
      return;
    }
    if(type==='add-journal'){
      const val=(fd.get('entry')||'').toString().trim();
      if(!val) return;
      await addJournalEntry(journalDraftType, val);
      return;
    }
    if(type==='confirm-typed'){
      const word = form.dataset.word;
      const typed = form.querySelector('#cf-typed').value.trim();
      if(typed!==word) return;
      await handleConfirmedAction();
      return;
    }
  }

  async function finishWizard(finalName, finalTheory){
    // Suspect-board page's "Continue"/"Finish setup" click (no finalName yet):
    // if we're past the 50% mark, detour through the final step to collect
    // the locked-in final suspect first.
    if(!finalName && wizard.progress>=50 && wizard.step<4){
      wizard.step=4; render(); return;
    }

    if(wizard.mode==='lock-existing'){
      const now = new Date().toISOString();
      const patch = {
        suspects: wizard.others,
        finalSuspect: finalName ? {name:finalName, theory:finalTheory, lockedAt:now} : null,
        locked: !!finalName,
        status: finalName ? 'locked' : activeCase.status,
        updatedAt: now
      };
      await DAL.updateCase(activeCase.id, patch);
      activeCase = Object.assign({}, activeCase, patch);
      wizard=null; view='case'; render();
      return;
    }

    // Defense in depth: the "start-wizard" action already blocks entry into
    // this flow once the trial limit is reached, but this second check
    // guarantees a capped account can never end up with an extra case.
    if(trialCapped()){
      wizard=null; view='dashboard'; modal='upsell'; render();
      return;
    }

    const now = new Date().toISOString();
    const data = {
      book:{title:wizard.title, author:wizard.author},
      progress:wizard.progress,
      primary:{name:wizard.primaryName, theory:wizard.primaryTheory},
      suspects:wizard.others,
      finalSuspect: finalName ? {name:finalName, theory:finalTheory, lockedAt:now} : null,
      locked: !!finalName,
      status: finalName ? 'locked' : 'active',
      resolution:null,
      plotTheory:wizard.plotTheory||'', twists:[], journal:[], rating:0,
      public:false,
      createdAt:now, updatedAt:now
    };
    const id = await DAL.createCase(data);
    wizard=null;
    await openCase(id);
  }

  async function setProgress(val){
    const c = activeCase;
    if(c.locked || c.status==='closed') return;
    const patch = {progress:val, updatedAt:new Date().toISOString()};
    if(val>=50 && !c.locked){
      await DAL.updateCase(c.id, patch);
      activeCase = Object.assign({}, c, patch);
      openFinalLockFlow();
      return;
    }
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    render();
  }

  // Rating the book itself is separate from a reader's detective work, so
  // unlike progress/suspects it stays editable any time, even after the
  // case is closed.
  async function setRating(val){
    const c = activeCase;
    if(!c) return;
    const patch = {rating:val, updatedAt:new Date().toISOString()};
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    render();
  }

  function openFinalLockFlow(){
    const c = activeCase;
    wizard = {mode:'lock-existing', step:4, progress:50, primaryName:c.primary?c.primary.name:'', others:(c.suspects||[]).slice(), finalName:'', finalTheory:''};
    view='wizard'; render();
  }

  async function removeSuspect(index){
    const c = activeCase;
    if(c.locked||c.status==='closed') return;
    const arr = (c.suspects||[]).slice();
    arr.splice(index,1);
    await DAL.updateCase(c.id, {suspects:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {suspects:arr});
    render();
  }

  async function addSuspectToCase(name, theory, trust){
    const c = activeCase;
    if(c.locked||c.status==='closed') return;
    const arr = (c.suspects||[]).concat([{name,theory,trust}]);
    await DAL.updateCase(c.id, {suspects:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {suspects:arr});
    modal=null; render();
  }

  async function savePlotTheory(val){
    const c = activeCase;
    if(c.status==='closed') return;
    await DAL.updateCase(c.id, {plotTheory:val, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {plotTheory:val});
    render();
  }

  async function addTwist(val){
    const c = activeCase;
    if(c.status==='closed') return;
    const arr = (c.twists||[]).slice();
    if(arr.length>=3) return;
    arr.push(val);
    await DAL.updateCase(c.id, {twists:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {twists:arr});
    render();
  }

  async function removeTwist(index){
    const c = activeCase;
    if(c.status==='closed') return;
    const arr = (c.twists||[]).slice();
    arr.splice(index,1);
    await DAL.updateCase(c.id, {twists:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {twists:arr});
    render();
  }

  async function addJournalEntry(type, text){
    const c = activeCase;
    if(c.status==='closed') return;
    const arr = (c.journal||[]).slice();
    arr.push({id:uid8(), type, text, createdAt:new Date().toISOString()});
    await DAL.updateCase(c.id, {journal:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {journal:arr});
    render();
  }

  async function removeJournalEntry(id){
    const c = activeCase;
    if(c.status==='closed') return;
    const arr = (c.journal||[]).filter(e=>e.id!==id);
    await DAL.updateCase(c.id, {journal:arr, updatedAt:new Date().toISOString()});
    activeCase = Object.assign({}, c, {journal:arr});
    render();
  }

  /* ============================== COMMUNITY BOARD ============================== */
  async function setCasePublic(isPublic){
    const c = activeCase;
    if(!c.locked) return;
    communityBoardError = '';
    const now = new Date().toISOString();
    const finalPick = c.finalSuspect || c.primary || {};
    const payload = {
      bookKey: bookKey(c.book),
      bookTitle: (c.book&&c.book.title)||'',
      bookAuthor: (c.book&&c.book.author)||'',
      displayName: (profile&&profile.displayName) || 'A detective',
      suspectName: finalPick.name||'',
      theory: finalPick.theory||'',
      plotTheory: c.plotTheory||'',
      solved: c.status==='closed' ? !!(c.resolution&&c.resolution.solved) : null,
      updatedAt: now
    };
    try{
      await DAL.setCasePublic(c.id, isPublic, payload);
      const patch = {public: isPublic, updatedAt: now};
      await DAL.updateCase(c.id, patch);
      activeCase = Object.assign({}, c, patch);
    }catch(err){
      communityBoardError = firebaseErrorMessage(err);
    }
    render();
  }

  async function openCommunity(){
    communityBoardError = '';
    try{
      communityTheories = await DAL.listCommunityTheories(bookKey(activeCase.book));
    }catch(err){
      communityTheories = [];
      communityBoardError = firebaseErrorMessage(err);
    }
    view = 'community';
    render();
  }

  function communityHTML(){
    const c = activeCase;
    if(!c) return `<div class="card pad"><p>Case not found.</p></div>`;
    const mine = uid || 'local';
    // Show every public entry for this book, including the reader's own —
    // tagged "You" below — so they can confirm their own theory made it in,
    // not just compare against other readers.
    const entries = communityTheories.slice().sort((a,b)=>{
      const aMine = (a.uid===mine && a.caseId===c.id) ? 0 : 1;
      const bMine = (b.uid===mine && b.caseId===c.id) ? 0 : 1;
      if(aMine!==bMine) return aMine-bMine;
      return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
    });

    let out = h`<button class="btn btn-ghost" data-action="back-to-case" style="margin-bottom:16px">${icon('back')} Back to case</button>
    <div class="suspects-head"><h2>${icon('book')} Community Board</h2><span style="font-weight:700;color:var(--warn-2)">Spoiler Alert</span></div>
    <p style="color:var(--text-faint);font-size:15.5px;margin:-4px 0 18px">Every reader who's made their final theory public for <b>${escapeHtml((c.book&&c.book.title)||'')}</b>${c.book&&c.book.author?' by '+escapeHtml(c.book.author):''}.</p>
    <div class="banner banner-warn">${icon('warn')}<span><b>Spoiler alert:</b> some of these theories come from readers who've already finished the book and closed their case &mdash; their reasoning may give away the actual culprit or ending. Read at your own risk.</span></div>`;

    if(communityBoardError){
      out += `<div class="banner banner-warn">${icon('warn')}<span>${escapeHtml(communityBoardError)}</span></div>`;
    }

    if(mode==='local'){
      out += `<div class="banner banner-demo">${icon('warn')}<span>You're in local mode, so this board only shows theories made public in this browser &mdash; connect Firebase (see README.md) so it can compare notes with other real readers.</span></div>`;
    }

    if(!entries.length){
      out += `<div class="theory-box empty">No one has made a theory public for this book yet. Be the first &mdash; toggle "Public" on your case page once you've locked in.</div>`;
    } else {
      out += `<div class="suspect-grid">${entries.map(e=>{
        const isMine = (e.uid===mine && e.caseId===c.id);
        return h`<div class="suspect-card ${isMine?'prime':''}">
        <span class="suspect-tag">${isMine?'You':escapeHtml(e.displayName||'A detective')}</span>
        <div class="suspect-name">${escapeHtml(e.suspectName||'—')}</div>
        <div class="suspect-theory">${escapeHtml(e.theory||'')}</div>
        ${e.plotTheory?`<div class="suspect-theory" style="margin-top:8px;font-style:italic">${escapeHtml(e.plotTheory)}</div>`:''}
        ${e.solved!=null?`<div style="margin-top:10px"><span class="badge ${e.solved?'badge-solved':'badge-escaped'}">${e.solved?icon('check')+' solved it':icon('x')+' got it wrong'}</span></div>`:''}
      </div>`;
      }).join('')}</div>`;
    }
    return out;
  }

  async function resolveCase(culprit){
    const c = activeCase;
    const solved = c.finalSuspect ? namesMatch(c.finalSuspect.name, culprit) : false;
    const patch = { status:'closed', progress:100, resolution:{actualCulprit:culprit, solved, closedAt:new Date().toISOString()}, updatedAt:new Date().toISOString() };
    await DAL.updateCase(c.id, patch);
    activeCase = Object.assign({}, c, patch);
    // If this theory is already shared to the community board, refresh the
    // public copy so its solved/escaped outcome stays in sync.
    if(activeCase.public){
      const finalPick = activeCase.finalSuspect || activeCase.primary || {};
      await DAL.setCasePublic(activeCase.id, true, {
        bookKey: bookKey(activeCase.book),
        bookTitle: (activeCase.book&&activeCase.book.title)||'',
        bookAuthor: (activeCase.book&&activeCase.book.author)||'',
        displayName: (profile&&profile.displayName) || 'A detective',
        suspectName: finalPick.name||'',
        theory: finalPick.theory||'',
        plotTheory: activeCase.plotTheory||'',
        solved,
        updatedAt: new Date().toISOString()
      });
    }
    modal=null; render();
  }

  async function handleConfirmedAction(){
    const m = modal;
    if(!m || m.type!=='confirm') return;
    if(m.kind==='delete-case'){
      if(activeCase.public){ await DAL.setCasePublic(activeCase.id, false, {}); }
      await DAL.deleteCase(activeCase.id);
      modal=null; cases=await DAL.listCases(); view='dashboard'; render(); return;
    }
    if(m.kind==='delete-case-tile'){
      const target = cases.find(cc=>cc.id===m.id) || (activeCase&&activeCase.id===m.id?activeCase:null);
      if(target && target.public){ await DAL.setCasePublic(m.id, false, {}); }
      await DAL.deleteCase(m.id);
      if(activeCase && activeCase.id===m.id){ activeCase=null; }
      cases = await DAL.listCases();
      modal=null; render(); return;
    }
    if(m.kind==='deactivate'){
      await DAL.updateProfile({status:'deactivated'});
      profile=null; modal=null; view='signup';
      // reload fresh state
      const p = await DAL.getProfile();
      profile = p;
      view = p ? 'deactivated' : 'signup';
      render(); return;
    }
    if(m.kind==='delete-account'){
      await DAL.wipeEverything();
      if(mode==='cloud' && auth){ try{ await auth.signOut(); }catch(e){} }
      uid=null; profileRef=null; casesRef=null;
      profile=null; cases=[]; modal=null; authScreenMode='signup'; view='signup'; render(); return;
    }
  }

  async function handleLogout(){
    if(mode==='cloud' && auth){
      try{ await auth.signOut(); }catch(e){}
    }
    uid=null; profileRef=null; casesRef=null;
    profile=null; cases=[]; activeCase=null; activeCaseId=null;
    authScreenMode='login'; authError='';
    view='signup'; render();
  }

  app.addEventListener('click', onClick);
  app.addEventListener('submit', onSubmit);
  app.addEventListener('change', onChange);

  init();
})();
