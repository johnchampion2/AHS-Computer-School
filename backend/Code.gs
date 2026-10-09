/**
 * AHS COMPUTER SCHOOL – Google Apps Script backend
 * 1) Create a Google Sheet, open Extensions > Apps Script, paste this file.
 * 2) Type the Main Admin row manually in the USERS sheet (see README), or run setupMainAdmin() once.
 * 3) Deploy > New deployment > Web app > Execute as: Me, Access: Anyone. Copy the URL into js/config.js.
 */
const FULL = ["Microsoft Windows","Microsoft Word","Microsoft Excel","Microsoft Access","Microsoft PowerPoint","Microsoft Publisher","Internet"];
const SHORT = ["Windows","Word","Excel","Access","PowerPoint","Publisher","Internet"];
const USER_H = ["User ID","Full Name","Username","Password Hash","Role","Account Status","Registration Date","Approved By","Approval Date"];
const STU_H = (function(){const h=["Student ID","Student Name"];SHORT.forEach((s,i)=>{h.push(FULL[i],s+" Interpretation")});return h.concat(["Final Grade","Final Interpretation","Access PIN"]);})();
const STAFF = ["Main Admin","Admin","Tutor"];
const MAIN_ADMIN = {fullName:"John Dwight Tholley", username:"mainadmin", password:"ChangeMe@123"};

function setupMainAdmin(){
  setup();
  if(findUser(MAIN_ADMIN.username)) return Logger.log("Main Admin already exists.");
  SS().getSheetByName("USERS").appendRow(["U-"+Date.now(),MAIN_ADMIN.fullName,MAIN_ADMIN.username,makeHash(MAIN_ADMIN.password),"Main Admin","Approved",new Date(),"System",new Date()]);
  Logger.log("Main Admin created. Change MAIN_ADMIN.password in the sheet flow by re-creating if needed.");
}
const SS=()=>SpreadsheetApp.getActiveSpreadsheet();
function ensure(name,h){
  let sh=SS().getSheetByName(name)||SS().insertSheet(name);
  const cur=sh.getRange(1,1,1,h.length).getValues()[0];
  if(cur.join("|")!==h.join("|")){sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight("bold").setBackground("#0b2a5b").setFontColor("#fff");sh.setFrozenRows(1);}
  return sh;
}
function setup(){
  ensure("USERS",USER_H);
  const st=ensure("STUDENTS",STU_H);
  st.getRange("A:A").setNumberFormat("@"); st.getRange("S:S").setNumberFormat("@");
}
function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return out({ok:true,data:"AHS API running"});}
function doPost(e){
  try{
    const r=JSON.parse(e.postData.contents); setup();
    const f=ROUTES[r.action]; if(!f) throw new Error("Unknown action.");
    return out({ok:true,data:f(r)});
  }catch(err){return out({ok:false,error:err.message});}
}
const ROUTES={login,register,studentResult,stats,users,approve,deleteUser,students,saveGrade,deleteStudent};

/* ---------- helpers ---------- */
const hex=s=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(b=>("0"+(b&255).toString(16)).slice(-2)).join("");
function makeHash(pw){const salt=Utilities.getUuid();return salt+"$"+hex(salt+pw);}
function checkHash(pw,stored){const p=String(stored).split("$");return p.length===2&&hex(p[0]+pw)===p[1];}
function interp(s){return s===""||s===null?"Incomplete Grade":s>=75?"Distinction":s>=65?"Credit":s>=50?"Pass":"Fail";}
function users_(){const v=SS().getSheetByName("USERS").getDataRange().getValues();v.shift();return v;}
function findUser(u){const x=String(u||"").trim().toLowerCase();return users_().map((r,i)=>({r,row:i+2})).filter(o=>String(o.r[2]).toLowerCase()===x)[0]||null;}
function auth(r,roles){
  const c=CacheService.getScriptCache().get("t_"+r.token);
  if(!r.token||!c) throw new Error("Session expired. Please log in again.");
  const s=JSON.parse(c);
  const u=findUser(s.username); if(!u||u.r[5]!=="Approved") throw new Error("Account not active.");
  if(roles.indexOf(s.role)<0) throw new Error("Access denied.");
  return s;
}
function obj(r,withPin){
  const o={id:String(r[0]),name:r[1],scores:SHORT.map((_,i)=>r[2+2*i]===""?null:Number(r[2+2*i])),final:r[16]===""?"Incomplete":r[16],finalInterp:r[17]||"Incomplete Grade"};
  if(withPin)o.pin=String(r[18]||"");return o;
}
function stuRows(){const v=SS().getSheetByName("STUDENTS").getDataRange().getValues();v.shift();return v;}
function recompute(row){
  let sum=0,all=true;
  SHORT.forEach((_,i)=>{const s=row[2+2*i];row[3+2*i]=interp(s);if(s==="")all=false;else sum+=Number(s);});
  const avg=Math.round(sum/7*100)/100;
  row[16]=all?avg:"Incomplete";row[17]=all?interp(avg):"Incomplete Grade";
}

/* ---------- auth & users ---------- */
function login(r){
  const cache=CacheService.getScriptCache(),k="f_"+String(r.username).toLowerCase(),fails=Number(cache.get(k)||0);
  if(fails>=5) throw new Error("Too many failed attempts. Try again in 10 minutes.");
  const u=findUser(r.username);
  let ok=false;
  if(u&&u.r[4]==="Main Admin"&&String(u.r[3]).indexOf("$")<0){
    // Main Admin typed manually in the sheet: accept plain password once, then store it hashed
    ok=String(u.r[3])===String(r.password);
    if(ok) SS().getSheetByName("USERS").getRange(u.row,4).setValue(makeHash(String(r.password)));
  }else if(u){ ok=checkHash(r.password,u.r[3]); }
  if(!u||!ok||u.r[4]!==r.role){cache.put(k,String(fails+1),600);throw new Error("Invalid username, password or role.");}
  if(u.r[5]==="Pending") throw new Error("Your account is awaiting approval from the Main Admin.");
  if(u.r[5]!=="Approved") throw new Error("Your account is not active.");
  const token=Utilities.getUuid();
  cache.put("t_"+token,JSON.stringify({username:u.r[2],role:u.r[4],name:u.r[1]}),21600);
  cache.remove(k);
  return {token,name:u.r[1],role:u.r[4],username:u.r[2]};
}
function register(r){
  const name=String(r.fullName||"").trim(),un=String(r.username||"").trim(),pw=String(r.password||"");
  if(!name||!un||pw.length<6) throw new Error("Please complete all fields (password min 6 characters).");
  if(["Admin","Tutor"].indexOf(r.role)<0) throw new Error("Invalid role.");
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    if(findUser(un)) throw new Error("This username is already taken.");
    SS().getSheetByName("USERS").appendRow(["U-"+Date.now(),name,un,makeHash(pw),r.role,"Pending",new Date(),"",""]);
  }finally{lock.releaseLock();}
  return "Registration successful! Your account is awaiting approval from the Main Admin.";
}
function users(r){
  auth(r,["Main Admin"]);
  return users_().filter(x=>x[4]!=="Main Admin").map(x=>({id:x[0],name:x[1],username:x[2],role:x[4],status:x[5],date:x[6]?Utilities.formatDate(new Date(x[6]),"UTC","yyyy-MM-dd"):"",by:x[7],appr:x[8]?Utilities.formatDate(new Date(x[8]),"UTC","yyyy-MM-dd"):""}));
}
function approve(r){
  const s=auth(r,["Main Admin"]);
  const o=users_().map((x,i)=>({x,row:i+2})).filter(o=>o.x[0]===r.id)[0];
  if(!o||o.x[4]==="Main Admin") throw new Error("User not found.");
  if(o.x[5]!=="Pending") throw new Error("Only pending accounts can be approved.");
  SS().getSheetByName("USERS").getRange(o.row,6,1,4).setValues([["Approved",o.x[6],s.name,new Date()]]);
  return true;
}
function deleteUser(r){
  auth(r,["Main Admin"]);
  const o=users_().map((x,i)=>({x,row:i+2})).filter(o=>o.x[0]===r.id)[0];
  if(!o) throw new Error("User not found.");
  if(o.x[4]==="Main Admin") throw new Error("The Main Admin account cannot be deleted.");
  SS().getSheetByName("USERS").deleteRow(o.row);return true;
}
function stats(r){
  const s=auth(r,STAFF),st=stuRows(),u=users_();
  const o={students:st.length,results:st.reduce((a,x)=>a+SHORT.filter((_,i)=>x[2+2*i]!=="").length,0)};
  if(s.role==="Main Admin"){o.admins=u.filter(x=>x[4]==="Admin").length;o.tutors=u.filter(x=>x[4]==="Tutor").length;o.pending=u.filter(x=>x[5]==="Pending").length;}
  return o;
}

/* ---------- students & grades ---------- */
function students(r){auth(r,STAFF);return stuRows().map(x=>obj(x,true));}
function studentResult(r){
  const id=String(r.id||"").trim(),pin=String(r.pin||"").trim();
  const row=stuRows().filter(x=>String(x[0]).toLowerCase()===id.toLowerCase())[0];
  if(!row) throw new Error("This Student ID Number does not exist in the system. Please check your ID Number and try again.");
  if(!pin||String(row[18])!==pin) throw new Error("Incorrect Access PIN for this Student ID.");
  return obj(row,false);
}
function saveGrade(r){
  auth(r,STAFF);
  const id=String(r.id||"").trim(),name=String(r.name||"").trim(),pi=FULL.indexOf(r.program);
  if(!id) throw new Error("Student ID is required.");
  if(pi<0) throw new Error("Please select a program.");
  const clear=r.score===""||r.score===null||r.score===undefined;
  if(!clear){const n=Number(r.score);if(isNaN(n)||n<0||n>100) throw new Error("Score must be between 0 and 100.");}
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const sh=SS().getSheetByName("STUDENTS"),v=sh.getDataRange().getValues();
    const idx=v.findIndex((x,i)=>i>0&&String(x[0])===id);
    let row;
    if(idx<0){
      if(!name) throw new Error("Student name is required for a new student.");
      if(clear) throw new Error("Please enter a score.");
      row=new Array(19).fill("");row[0]=id;row[1]=name;row[18]=String(Math.floor(1000+Math.random()*9000));
    }else{
      row=v[idx];
      if(!r.overwrite&&!clear&&row[2+2*pi]!=="") return {duplicate:true};
      if(name) row[1]=name;
    }
    row[2+2*pi]=clear?"":Number(r.score);recompute(row);
    if(idx<0) sh.appendRow(row); else sh.getRange(idx+1,1,1,19).setValues([row]);
    return {saved:true};
  }finally{lock.releaseLock();}
}
function deleteStudent(r){
  auth(r,["Main Admin","Admin"]);
  const sh=SS().getSheetByName("STUDENTS"),v=sh.getDataRange().getValues();
  const idx=v.findIndex((x,i)=>i>0&&String(x[0])===String(r.id));
  if(idx<0) throw new Error("Record not found.");
  sh.deleteRow(idx+1);return true;
}
