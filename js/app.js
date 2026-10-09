const P=["Microsoft Windows","Microsoft Word","Microsoft Excel","Microsoft Access","Microsoft PowerPoint","Microsoft Publisher","Internet"];
const SH=["Windows","Word","Excel","Access","PowerPoint","Publisher","Internet"];
const $=i=>document.getElementById(i);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const interp=s=>s===null||s===""||s===undefined?"Incomplete Grade":s>=75?"Distinction":s>=65?"Credit":s>=50?"Pass":"Fail";
const badge=t=>`<span class="b ${t.split(" ")[0]}">${esc(t)}</span>`;
let S=JSON.parse(sessionStorage.getItem("ahs")||"null"),students=[],curCert=null,page="home",locked=false;

async function api(action,data={}){
  if(!CONFIG.API_URL||CONFIG.API_URL.includes("PASTE")) throw new Error("Set your Apps Script URL in js/config.js first.");
  const r=await fetch(CONFIG.API_URL,{method:"POST",body:JSON.stringify({action,token:S&&S.token,...data})});
  const j=await r.json(); if(!j.ok) throw new Error(j.error||"Request failed."); return j.data;
}
async function busy(btn,fn){const t=btn.textContent;btn.disabled=true;btn.textContent="Please wait…";try{return await fn();}finally{btn.disabled=false;btn.textContent=t;}}
function toast(m,bad,ms=2500){const t=$("toast");t.textContent=m;t.className="toast"+(bad?" bad":"");setTimeout(()=>t.classList.add("hidden"),ms);}
function view(id){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(id).classList.remove("hidden");window.scrollTo(0,0);}
function modal(html){$("mbox").innerHTML=html;$("modal").classList.remove("hidden");}
function closeModal(){$("modal").classList.add("hidden");}
function confirmBox(msg,yes){modal(`<h3>Please confirm</h3><p>${esc(msg)}</p><div class="row"><button class="btn ghost" id="cn">Cancel</button><button class="btn red" id="cy">Yes, continue</button></div>`);$("cn").onclick=closeModal;$("cy").onclick=()=>{closeModal();yes();};}

/* ---------- boot ---------- */
$("sProg").innerHTML=["All Programs",...P].map(p=>`<option>${p}</option>`).join("");
function boot(){$("splash").style.opacity=0;setTimeout(()=>$("splash").classList.add("hidden"),500);S?enterApp():view("v-login");roleChange();}
if(sessionStorage.getItem("splash")){$("splash").classList.add("hidden");setTimeout(boot,0);}
else setTimeout(()=>{sessionStorage.setItem("splash","1");boot();},5000);

/* ---------- login ---------- */
function roleChange(){const st=$("lRole").value==="Student";$("lStaff").classList.toggle("hidden",st);$("lStud").classList.toggle("hidden",!st);$("regLink").classList.toggle("hidden",!["Admin","Tutor"].includes($("lRole").value));$("lErr").textContent="";}
$("lRole").onchange=roleChange;
$("goReg").onclick=e=>{e.preventDefault();view("v-register");};
$("backLogin").onclick=e=>{e.preventDefault();view("v-login");};
$("loginForm").onsubmit=async e=>{
  e.preventDefault();$("lErr").textContent="";const role=$("lRole").value;
  await busy($("lBtn"),async()=>{try{
    if(role==="Student"){
      const id=$("sId").value.trim(),pin=$("sPin").value.trim();
      if(!id||!pin) throw new Error("Enter your Student ID and Access PIN.");
      const st=await api("studentResult",{id,pin});showStudent(st,$("sProg").value);
    }else{
      if(!$("lUser").value.trim()||!$("lPass").value) throw new Error("Enter your username and password.");
      S=await api("login",{role,username:$("lUser").value.trim(),password:$("lPass").value});
      sessionStorage.setItem("ahs",JSON.stringify(S));$("lPass").value="";enterApp();
    }}catch(x){$("lErr").textContent=x.message;}});
};
$("regForm").onsubmit=async e=>{
  e.preventDefault();$("rMsg").className="err";$("rMsg").textContent="";
  await busy($("rBtn"),async()=>{try{
    const m=await api("register",{fullName:$("rName").value,username:$("rUser").value,password:$("rPass").value,role:$("rRole").value});
    $("rMsg").className="err";$("rMsg").style.color="var(--ok)";$("rMsg").textContent=m;$("regForm").reset();
  }catch(x){$("rMsg").style.color="";$("rMsg").textContent=x.message;}});
};

/* ---------- student view ---------- */
function showStudent(st,prog){
  curCert=st;let h=`<div class="rcard"><h3>${esc(st.name)}</h3><div class="muted">Student ID: <b>${esc(st.id)}</b></div></div>`;
  if(prog!=="All Programs"){
    const i=P.indexOf(prog),s=st.scores[i];
    h+=`<div class="rcard"><h3>${esc(prog)}</h3>`+(s===null?`<div class="q">?</div><p>No grade has been entered for this program yet. Please check back later.</p>`:`<p style="font-size:2rem;margin:6px 0"><b>${s}</b> ${badge(interp(s))}</p>`)+`</div>`;
  }else{
    const rows=P.map((p,i)=>st.scores[i]===null?"":`<tr><td>${p}</td><td class="c">${st.scores[i]}</td><td>${badge(interp(st.scores[i]))}</td></tr>`).join("");
    h+=`<div class="rcard"><h3>All Recorded Results</h3>`+(rows?`<div class="tablewrap"><table class="tbl" style="min-width:0"><thead><tr><th>Program</th><th class="c">Score</th><th>Interpretation</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<p>No grades have been entered yet.</p>`)+`</div>`;
  }
  h+=`<div class="rcard"><h3>Final Grade</h3><p style="margin:4px 0"><b>${esc(st.final)}</b> ${badge(st.finalInterp)}</p></div><button class="btn" id="stCert">View Result Certificate</button>`;
  $("stBody").innerHTML=h;$("stCert").onclick=()=>openCert(st);view("v-student");
}
$("stBack").onclick=()=>{$("sPin").value="";view("v-login");};

/* ---------- app shell ---------- */
function enterApp(){
  $("uName").textContent=S.name;$("uRole").textContent=S.role;
  $("navAdmin").classList.toggle("hidden",S.role!=="Main Admin");
  $("welcome").textContent=`Welcome, ${S.name}, to the AHS Computer Training School!`;
  $("qaAdmin").classList.toggle("hidden",S.role!=="Main Admin");$("today").textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});view("v-app");nav("home");
}
function nav(p){
  page=p;["home","results","admin"].forEach(x=>$("p-"+x).classList.toggle("hidden",x!==p));
  document.querySelectorAll("#sidebar nav a[data-p]").forEach(a=>a.classList.toggle("active",a.dataset.p===p));
  closeMenu();refreshLock();
  if(p==="home")loadStats();if(p==="results")loadStudents();if(p==="admin")loadUsers();
}
document.querySelectorAll("#sidebar nav a[data-p]").forEach(a=>a.onclick=()=>nav(a.dataset.p));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>nav(b.dataset.go));
function closeMenu(){$("sidebar").classList.remove("open");$("overlay").classList.remove("show");}
$("menuBtn").onclick=()=>{$("sidebar").classList.toggle("open");$("overlay").classList.toggle("show");};
$("overlay").onclick=closeMenu;
$("logout").onclick=()=>{S=null;$("sysBar").classList.add("hidden");sessionStorage.removeItem("ahs");$("lUser").value="";view("v-login");};
async function guard(fn){try{return await fn();}catch(x){toast(x.message,true,3500);if(/Session expired/.test(x.message))$("logout").click();}}

/* ---------- system open / close ---------- */
function applyLock(l){
  locked=!!l;const bar=$("sysBar"),b=$("sysBtn"),main=S&&S.role==="Main Admin";
  bar.classList.remove("hidden");bar.classList.toggle("closed",locked);
  $("sysTxt").textContent=locked?"🔒 System CLOSED – grade entry, editing and deletion are disabled.":"🔓 System OPEN – grades can be entered.";
  b.textContent=locked?"Open System":"Close System";b.className="btn sm"+(locked?"":" red")+(main?"":" hidden");
  $("addBtn").disabled=locked;
}
async function refreshLock(){const s=await guard(()=>api("status"));if(s){applyLock(s.locked);if(page==="results"&&students.length)renderStudents();}}
$("sysBtn").onclick=()=>confirmBox(locked?"Open the system so grades can be entered again?":"Close the system? Nobody will be able to enter, edit or delete grades until you open it again.",()=>guard(async()=>{const s=await api("setLock",{locked:!locked});applyLock(s.locked);toast(s.locked?"System closed.":"System opened.");if(page==="results")renderStudents();}));

async function loadStats(){
  const s=await guard(()=>api("stats"));if(!s)return;
  const c=[["Total Students",s.students,"🎓"],["Recorded Results",s.results,"📝"]];
  if(S.role==="Main Admin")c.push(["Admin Accounts",s.admins,"🛡️"],["Tutor Accounts",s.tutors,"👩‍🏫"],["Pending Registrations",s.pending,"⏳"]);
  $("stats").innerHTML=c.map(x=>`<div class="stat"><i>${x[2]}</i><div><b>${x[1]}</b><span>${x[0]}</span></div></div>`).join("");
}

/* ---------- results table ---------- */
$("stuTbl").tHead.innerHTML=`<tr><th>Student ID</th><th>Name</th>${SH.map(s=>`<th class="c">${s}</th>`).join("")}<th class="c">Final</th><th>Interpretation</th><th>PIN</th><th>Actions</th></tr>`;
async function loadStudents(){const d=await guard(()=>api("students"));if(d){students=d;renderStudents();}}
function renderStudents(){
  const q=$("search").value.trim().toLowerCase();let list=students.slice(),exact=null;
  if(q){exact=students.find(s=>s.id.toLowerCase()===q)||null;
    const m=s=>s===exact||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q);
    list=[...list.filter(m),...list.filter(s=>!m(s))];}
  const can=S.role!=="Tutor";
  $("stuTbl").tBodies[0].innerHTML=list.map(s=>{
    const hit=q&&(s===exact||(!exact&&s.name.toLowerCase().includes(q)));
    return `<tr class="${hit&&s===exact?"flash":""}"><td>${esc(s.id)}</td><td>${esc(s.name)}</td>${s.scores.map(x=>`<td class="c">${x===null?"—":x}</td>`).join("")}<td class="c"><b>${esc(s.final)}</b></td><td>${badge(s.finalInterp)}</td><td>${esc(s.pin)}</td>
    <td><button class="ico" title="View" data-a="v" data-i="${esc(s.id)}">👁️</button><button class="ico" title="Edit" ${locked?"disabled":""} data-a="e" data-i="${esc(s.id)}">✏️</button>${can?`<button class="ico" title="Delete" ${locked?"disabled":""} data-a="d" data-i="${esc(s.id)}">🗑️</button>`:""}</td></tr>`;
  }).join("")||`<tr><td colspan="13" class="center muted" style="padding:24px">No student records found.</td></tr>`;
}
$("search").oninput=renderStudents;
$("stuTbl").onclick=e=>{const b=e.target.closest("button");if(!b)return;const s=students.find(x=>x.id===b.dataset.i);
  if(b.dataset.a==="v")openCert(s);if(b.dataset.a==="e")gradeForm(s);
  if(b.dataset.a==="d")confirmBox(`Delete all results for ${s.name} (${s.id})?`,()=>guard(async()=>{await api("deleteStudent",{id:s.id});toast("Student record deleted.");loadStudents();}));};
$("addBtn").onclick=()=>gradeForm(null);

function gradeForm(s){
  const edit=!!s;
  modal(`<h3>${edit?"Edit Grade":"Add Grade"}</h3>
  <label>Student ID Number</label><input id="gId" value="${edit?esc(s.id):""}" ${edit?"readonly":""}>
  <label>Student Name</label><input id="gName" value="${edit?esc(s.name):""}">
  <label>Program</label><select id="gProg">${P.map(p=>`<option>${p}</option>`).join("")}</select>
  <label>Score (0 – 100)</label><input id="gScore" type="number" min="0" max="100" step="any" inputmode="decimal">
  <label>Description</label><input id="gDesc" readonly value="Incomplete Grade">
  <p class="err" id="gErr"></p>
  <div class="row"><button class="btn ghost" id="gClear">Clear</button><button class="btn" id="gSave">Save</button></div>
  <div class="row"><button class="btn ghost" id="gCancel">Cancel</button></div>`);
  const cur=()=>students.find(x=>x.id===$("gId").value.trim());
  const desc=()=>{const v=$("gScore").value;$("gDesc").value=v===""?"Incomplete Grade":interp(Number(v));};
  const fill=()=>{const c=cur();if(c){if(!edit||true)$("gName").value=c.name;const v=c.scores[P.indexOf($("gProg").value)];$("gScore").value=v===null?"":v;}desc();};
  $("gScore").oninput=desc;$("gProg").onchange=()=>{const c=cur();const v=c?c.scores[P.indexOf($("gProg").value)]:null;$("gScore").value=v===null||v===undefined?"":v;desc();};
  $("gId").onchange=()=>{const c=cur();if(c){$("gName").value=c.name;$("gProg").onchange();}};
  if(edit)fill();
  $("gClear").onclick=()=>{if(!edit)$("gId").value="";if(!edit)$("gName").value="";$("gScore").value="";desc();$("gErr").textContent="";};
  $("gCancel").onclick=closeModal;
  $("gSave").onclick=()=>busy($("gSave"),async()=>{
    const d={id:$("gId").value.trim(),name:$("gName").value.trim(),program:$("gProg").value,score:$("gScore").value,overwrite:edit};
    try{
      if(d.score!==""&&(Number(d.score)<0||Number(d.score)>100))throw new Error("Score must be between 0 and 100.");
      let r=await api("saveGrade",d);
      if(r.duplicate){
        const go=await new Promise(res=>{modal(`<h3>Grade already exists</h3><p>A grade for ${esc(d.program)} already exists for this student. Do you want to edit the existing grade?</p><div class="row"><button class="btn ghost" id="n">No</button><button class="btn" id="y">Edit it</button></div>`);$("n").onclick=()=>res(false);$("y").onclick=()=>res(true);});
        if(!go){closeModal();return;}
        r=await api("saveGrade",{...d,overwrite:true});
      }
      modal(`<h3 class="center" style="color:var(--ok)">✔ Success</h3><p class="center">Student grade saved successfully!</p>`);
      setTimeout(closeModal,2000);loadStudents();
    }catch(x){if($("gErr"))$("gErr").textContent=x.message;else toast(x.message,true);}
  });
}

/* ---------- admin panel ---------- */
async function loadUsers(){
  const u=await guard(()=>api("users"));if(!u)return;window._u=u;
  $("userBody").innerHTML=u.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.name)}</td><td>${esc(x.username)}</td><td>${esc(x.role)}</td><td>${badge(x.status)}</td><td>${esc(x.date)}</td>
  <td><button class="ico" data-a="v" data-i="${esc(x.id)}">👁️ View</button>${x.status==="Pending"?`<button class="ico" data-a="a" data-i="${esc(x.id)}">✅ Approve</button>`:""}<button class="ico" data-a="d" data-i="${esc(x.id)}">🗑️ Delete</button></td></tr>`).join("")||`<tr><td colspan="7" class="center muted" style="padding:22px">No registered accounts yet.</td></tr>`;
}
$("userBody").onclick=e=>{const b=e.target.closest("button");if(!b)return;const u=window._u.find(x=>x.id===b.dataset.i);
  if(b.dataset.a==="v")modal(`<h3>${esc(u.name)}</h3><p>Username: <b>${esc(u.username)}</b><br>Role: ${esc(u.role)}<br>Status: ${esc(u.status)}<br>Registered: ${esc(u.date)}<br>Approved by: ${esc(u.by||"—")} ${esc(u.appr)}</p><button class="btn" onclick="closeModal()">Close</button>`);
  if(b.dataset.a==="a")guard(async()=>{await api("approve",{id:u.id});toast("Account approved.");loadUsers();});
  if(b.dataset.a==="d")confirmBox(`Delete the account of ${u.name}?`,()=>guard(async()=>{await api("deleteUser",{id:u.id});toast("Account deleted.");loadUsers();}));};

/* ---------- certificate ---------- */
const PCIMG="assets/images/computer.png";
function certHTML(st){
  const rows=P.map((p,i)=>st.scores[i]===null?"":`<tr><td>${p.toUpperCase()}</td><td class="c">${st.scores[i]}</td><td class="c">${interp(st.scores[i]).toUpperCase()}</td></tr>`).join("")||`<tr><td colspan="3" class="c">NO GRADES RECORDED YET</td></tr>`;
  const done=st.final!=="Incomplete",date=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}).toUpperCase();
  return `<div class="frame"></div><img class="wm" src="${CONFIG.LOGO}" onerror="this.style.display='none'" alt=""><div class="in">
  <div class="hd"><img class="pc" src="${PCIMG}" onerror="this.style.visibility='hidden'" alt=""><div class="mid"><h1>${CONFIG.SCHOOL}</h1><h2>COMPUTER TRAINING PROGRAM</h2></div><img class="lg" src="${CONFIG.LOGO}" onerror="this.style.visibility='hidden'" alt=""></div>
  <div class="rule"></div><div class="title">STATEMENT OF RESULT</div><div class="exam">CERTIFICATE IN MICROSOFT OFFICE PACKAGE</div>
  <div class="info"><div><b>STUDENT ID:</b> ${esc(st.id)}</div><div><b>STUDENT NAME:</b> ${esc(st.name.toUpperCase())}</div></div>
  <table><thead><tr><th>MODULE TITLE</th><th class="c" style="width:110px">GRADE</th><th class="c" style="width:200px">INTERPRETATION</th></tr></thead><tbody>${rows}
  <tr class="fin"><td>FINAL GRADE</td><td class="c">${done?esc(st.final):"INCOMPLETE"}</td><td class="c">${done?st.finalInterp.toUpperCase():"INCOMPLETE GRADE"}</td></tr></tbody></table>
  <div class="result">RESULT: ${done?st.finalInterp.toUpperCase():"INCOMPLETE"}</div>
  <div class="foot"><div class="sig"><div><div class="ln">PROGRAM DIRECTOR</div></div><div><div style="font-size:15px;margin-bottom:4px">${date}</div><div class="ln">DATE</div></div></div>
  <div class="notice">ANY ALTERATION OF THIS STATEMENT RENDERS IT INVALID</div></div></div>`;
}
function fitCert(){const w=Math.min(794,innerWidth-34),k=w/794;$("certScale").style.transform=`scale(${k})`;document.querySelector(".certview").style.height=(1123*k+16)+"px";}
function openCert(st){curCert=st;$("cert").innerHTML=certHTML(st);$("certModal").classList.remove("hidden");fitCert();}
addEventListener("resize",()=>{if(!$("certModal").classList.contains("hidden"))fitCert();});
$("cClose").onclick=()=>$("certModal").classList.add("hidden");
$("cPrint").onclick=()=>{const t=$("certScale").style.transform;$("certScale").style.transform="none";document.querySelector(".certview").style.height="auto";print();setTimeout(fitCert,300);};
async function snap(){
  const el=$("cert"),w=$("certScale"),t=w.style.transform;w.style.transform="none";
  await Promise.all([...el.querySelectorAll("img")].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;})));
  try{return await html2canvas(el,{scale:3,backgroundColor:"#ffffff",useCORS:true});}finally{w.style.transform=t;}
}
const fname=()=>"Result_"+String(curCert.id).replace(/[^\w-]/g,"_");
$("cImg").onclick=()=>busy($("cImg"),async()=>{try{const c=await snap(),a=document.createElement("a");a.href=c.toDataURL("image/png");a.download=fname()+".png";a.click();}catch(x){toast("Could not create image: "+x.message,true);}});
$("cPdf").onclick=()=>busy($("cPdf"),async()=>{try{const c=await snap(),d=new jspdf.jsPDF({unit:"mm",format:"a4"});d.addImage(c.toDataURL("image/jpeg",.95),"JPEG",0,0,210,297);d.save(fname()+".pdf");}catch(x){toast("Could not create PDF: "+x.message,true);}});

/* ---------- print all results ---------- */
function logoData(){return new Promise(r=>{const i=new Image();i.onload=()=>{try{const c=document.createElement("canvas");c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext("2d").drawImage(i,0,0);r({d:c.toDataURL("image/png"),w:i.naturalWidth,h:i.naturalHeight});}catch(e){r(null);}};i.onerror=()=>r(null);i.src=CONFIG.LOGO;});}
$("pdfAll").onclick=()=>busy($("pdfAll"),async()=>{
  if(!students.length)return toast("No results to print.",true);
  const lg=await logoData(),d=new jspdf.jsPDF({orientation:"landscape",unit:"mm",format:"a4"}),date=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  d.autoTable({startY:34,margin:{top:34,left:8,right:8,bottom:14},theme:"grid",
    head:[["Student ID","Name",...SH,"Final","Final Interpretation"]],
    body:students.map(s=>[s.id,s.name,...s.scores.map(x=>x===null?"—":x),s.final,s.finalInterp]),
    styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:[11,42,91],textColor:255,halign:"center"},alternateRowStyles:{fillColor:[243,246,251]},
    columnStyles:{0:{cellWidth:24},1:{cellWidth:46}},
    didDrawPage:()=>{if(lg)d.addImage(lg.d,"PNG",8,6,40,40*lg.h/lg.w);d.setTextColor(11,42,91);d.setFont("helvetica","bold").setFontSize(15);d.text(CONFIG.SCHOOL,150,13,{align:"center"});
      d.setFontSize(10).text("COMPUTER TRAINING PROGRAM – CONSOLIDATED RESULTS REPORT",150,20,{align:"center"});
      d.setDrawColor(201,162,39).setLineWidth(.8).line(8,30,289,30);
      d.setFont("helvetica","normal").setFontSize(8).setTextColor(100).text(`Generated ${date}`,8,205);d.text("Page "+d.internal.getNumberOfPages(),289,205,{align:"right"});}});
  d.save("AHS_All_Results.pdf");
});

/* ---------- install as app (PWA) ---------- */
let deferred=null;
const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
if("serviceWorker" in navigator&&location.protocol!=="file:")addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;});
addEventListener("appinstalled",()=>{deferred=null;document.querySelectorAll(".installBtn").forEach(b=>b.classList.add("hidden"));toast("AHS Computer School app installed!");});
if(!standalone)document.querySelectorAll(".installBtn").forEach(b=>{b.classList.remove("hidden");b.onclick=async()=>{
  closeMenu();
  if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;return;}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  modal(`<h3>📲 Install AHS COMPUTER SCHOOL</h3><p>${ios?"On iPhone/iPad (Safari): tap the <b>Share</b> button, then choose <b>Add to Home Screen</b>.":"Open your browser menu (⋮) and tap <b>Install app</b> or <b>Add to Home screen</b>."}</p><p class="muted" style="font-size:.85rem">The app uses the school logo and opens like a normal app.</p><button class="btn" onclick="closeModal()">OK</button>`);
};});
