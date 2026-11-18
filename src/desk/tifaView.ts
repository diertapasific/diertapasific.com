import { tifaHome } from './tifaMotion'

export function tifaLayout(width: number, height: number) {
  const mobile=width<768,short=height<550
  const top=mobile?(height<480?116:height<620?156:Math.max(204,Math.min(246,height*.29))):short?120:Math.min(145,height*.24)
  const bottom=mobile?(short?12:24):short?20:132
  const chat={left:mobile?16:width*.55,top,width:mobile?width-32:Math.min(480,width*.40),height:Math.max(120,height-top-bottom)}
  const petTop=mobile?(height<480?80:height<620?92:128):short?112:140,petBottom=mobile?top-16:height-(short?32:145)
  const zoom=mobile?Math.max(short?24:36,Math.min((width-32)/2.7,(petBottom-petTop)/1.72)):Math.max(58,Math.min(width*.47/2.6,(petBottom-petTop)/1.8))
  return {mobile,chat,zoom,petX:width*(mobile?.5:.28),petY:(petTop+petBottom)/2}
}

export function tifaView(width: number, height: number) {
  const layout=tifaLayout(width,height),zoom=layout.zoom
  const offset: [number,number,number]=[3,1.45,8]
  const length=Math.hypot(...offset),rightX=offset[2]/Math.hypot(offset[0],offset[2]),rightZ=-offset[0]/Math.hypot(offset[0],offset[2])
  const upY=Math.hypot(offset[0],offset[2])/length,upX=-offset[0]*offset[1]/(length*Math.hypot(offset[0],offset[2])),upZ=-offset[2]*offset[1]/(length*Math.hypot(offset[0],offset[2]))
  const xShift=(width/2-layout.petX)/zoom,yShift=(layout.petY-height/2)/zoom
  const target: [number,number,number]=[tifaHome[0]+rightX*xShift+upX*yShift,tifaHome[1]+(layout.mobile?.68:.54)+upY*yShift,tifaHome[2]+rightZ*xShift+upZ*yShift]
  return {target,offset,zoom}
}
