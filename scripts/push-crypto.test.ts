// Alleen lokale TLS-fixtures; nooit een echte pushprovider of collega benaderen.
import webpush from 'npm:web-push@3.6.7'
import ece from 'npm:http_ece@1.2.0'
import { createECDH, randomBytes } from 'node:crypto'
import { Agent } from 'node:https'
import { Buffer } from 'node:buffer'

Deno.test('Deno verzendt versleutelde RFC8291 Web Push over geverifieerde lokale TLS',async()=>{
  let server:Deno.HttpServer|undefined
  try{
    const [certPath,keyPath]=Deno.args
    if(!certPath||!keyPath)throw new Error('Geef het lokale testcertificaat en de testsleutel mee; gebruik --cert voor dat certificaat')
    const cert=await Deno.readTextFile(certPath),key=await Deno.readTextFile(keyPath)
    const client=createECDH('prime256v1');client.generateKeys()
    const auth=randomBytes(16),vapid=webpush.generateVAPIDKeys()
    let received=''
    server=Deno.serve({hostname:'127.0.0.1',port:0,cert,key,onListen:()=>{}},async req=>{
      if(req.headers.get('content-encoding')!=='aes128gcm'||!req.headers.get('authorization')?.startsWith('vapid '))return new Response('Onjuiste pushheaders',{status:400})
      const encrypted=Buffer.from(await req.arrayBuffer())
      received=ece.decrypt(encrypted,{privateKey:client,authSecret:auth,version:'aes128gcm'}).toString('utf8')
      return new Response(null,{status:201})
    })
    // Vertrouw uitsluitend het expliciete lokale testcertificaat; TLS-verificatie blijft aan.
    const trustedAgent=new Agent({ca:cert})
    try{
      const endpoint=`https://127.0.0.1:${(server.addr as Deno.NetAddr).port}/fixture`
      const payload=JSON.stringify({eventId:'20000000-0000-4000-8000-000000000001',title:'Meldpunt VWO – SPOED',body:'Fixture is onderweg naar TEST-ruimte.',ticketId:1})
      const result=await webpush.sendNotification({endpoint,keys:{p256dh:client.getPublicKey().toString('base64url'),auth:auth.toString('base64url')}},payload,
        {vapidDetails:{...vapid,subject:'mailto:fixture@example.invalid'},agent:trustedAgent,timeout:3000})
      if(result.statusCode!==201||received!==payload)throw new Error('Versleutelde push kwam niet intact aan')
    }finally{trustedAgent.destroy()}
  }finally{
    await server?.shutdown()
  }
})
