import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircleTinted, Close } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Screen, ScrimButton } from '@/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legal';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { usePurchases } from '@/store/purchases-store';
import { useColors } from '@/theme/theme-context';

const benefits = ['Unlimited recipe imports', 'Import photos, videos, links and text', 'Meal planning and smart grocery lists', 'Sync recipes across your devices'];

export default function Paywall() {
  const toast = useToast(), c = useColors(), router = useRouter(), insets = useSafeAreaInsets();
  const { configured, packages, purchasePackage, restorePurchases } = usePurchases();
  const { importsUsed, importLimit, freeAccessDaysLeft } = useStore();
  const [busy, setBusy] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const plans = useMemo(() => packages.filter((p) => ['ANNUAL', 'MONTHLY'].includes(p.packageType)), [packages]);
  const selected = plans.find((p) => p.identifier === selectedId) ?? plans.find((p) => p.packageType === 'ANNUAL') ?? plans[0];
  const buy = async () => { if (!selected || busy) return; setBusy(true); try { if (await purchasePackage(selected)) router.replace('/notifications'); } catch (e) { const m=e instanceof Error?e.message:'Could not complete the purchase'; if(!m.toLowerCase().includes('cancel')) toast.show(m); } finally { setBusy(false); } };
  const restore = async () => { if (busy) return; setBusy(true); try { const ok=await restorePurchases(); toast.show(ok?'Asepo Pro restored':'No active Asepo Pro purchase found'); if(ok) router.replace('/notifications'); } catch(e) { toast.show(e instanceof Error?e.message:'Could not restore purchases'); } finally { setBusy(false); } };
  return <Screen><ScrollView contentContainerStyle={{paddingBottom:insets.bottom+24}} showsVerticalScrollIndicator={false}>
    <View style={{height:285,overflow:'hidden',justifyContent:'flex-end'}}><Image source={require('../../assets/images/paywall-hero.jpg')} resizeMode="cover" accessibilityLabel="A prepared meal" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}/><LinearGradient colors={['rgba(0,0,0,0)','rgba(0,0,0,.75)']} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/><View style={{padding:24}}><Text style={{color:'#FACC15',fontSize:12,fontWeight:'800',letterSpacing:1.2}}>ASEPO PRO</Text><Text style={{color:'#fff',fontSize:32,fontWeight:'800',lineHeight:36,marginTop:5}}>Cook smarter.{`\n`}Keep every recipe.</Text></View></View>
    <View style={{paddingHorizontal:20,paddingTop:20}}><View style={{backgroundColor:c.accentTint,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12}}><Text style={{fontSize:22}}>✦</Text><View style={{flex:1}}><Text style={{color:c.text,fontSize:15,fontWeight:'700'}}>Free for 3 imports or 3 days</Text><Text style={{color:c.textSec,fontSize:12.5,marginTop:2}}>{Math.max(0,importLimit-importsUsed)} imports and {freeAccessDaysLeft} days remaining · whichever comes first</Text></View></View>
      <View style={{gap:10,marginTop:18}}>{benefits.map(x=><View key={x} style={{flexDirection:'row',alignItems:'center',gap:10}}><CheckCircleTinted color={c.accent} tint={c.accentTint2}/><Text style={{flex:1,color:c.text,fontSize:14.5,fontWeight:'500'}}>{x}</Text></View>)}</View>
      <View style={{gap:11,marginTop:22}}>{plans.map(p=><PlanCard key={p.identifier} plan={p} selected={p.identifier===selected?.identifier} onPress={()=>setSelectedId(p.identifier)}/>)}</View>
      {!configured||!plans.length?<Text style={{color:c.textSec,textAlign:'center',marginTop:16,fontSize:12.5}}>Subscription prices are loading. Check your connection and try again.</Text>:null}
      <Pressable accessibilityRole="button" disabled={!selected||busy} onPress={()=>void buy()} style={{height:56,marginTop:18,borderRadius:18,backgroundColor:selected&&!busy?c.accent:c.chipBg,alignItems:'center',justifyContent:'center'}}><Text style={{color:selected&&!busy?'#fff':c.textSec,fontSize:17,fontWeight:'800'}}>{busy?'Please wait…':'Continue with Asepo Pro'}</Text></Pressable>
      {selected?<Text style={{color:c.textSec,fontSize:11.5,lineHeight:17,textAlign:'center',marginTop:10}}>{selected.product.priceString} per {selected.packageType==='ANNUAL'?'year':'month'}. Renews automatically unless cancelled at least 24 hours before the billing period ends.</Text>:null}
      <View style={{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:22,marginTop:18}}><Pressable accessibilityRole="button" disabled={busy||!configured} onPress={()=>void restore()}><Text style={{color:c.textSec,fontWeight:'600',fontSize:12.5}}>Restore purchases</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(TERMS_URL)}><Text style={{color:c.textSec,fontWeight:'600',fontSize:12.5}}>Terms</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(PRIVACY_URL)}><Text style={{color:c.textSec,fontWeight:'600',fontSize:12.5}}>Privacy</Text></Pressable></View>
    </View></ScrollView><ScrimButton onPress={()=>safeBack(router,'/(tabs)/home')} style={{position:'absolute',top:insets.top+8,right:16}}><Close color="#fff"/></ScrimButton></Screen>;
}

function PlanCard({plan,selected,onPress}:{plan:PurchasesPackage;selected:boolean;onPress:()=>void}) { const c=useColors(), annual=plan.packageType==='ANNUAL'; return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={onPress} style={{borderWidth:selected?2:1,borderColor:selected?c.accent:c.border,borderRadius:18,minHeight:76,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:13,backgroundColor:selected?c.accentTint:c.surface}}><View style={{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:selected?c.accent:c.textSec,alignItems:'center',justifyContent:'center'}}>{selected?<View style={{width:12,height:12,borderRadius:6,backgroundColor:c.accent}}/>:null}</View><View style={{flex:1}}><Text style={{color:c.text,fontSize:16,fontWeight:'800'}}>{annual?'Annual':'Monthly'}</Text><Text style={{color:c.textSec,fontSize:12,marginTop:3}}>{annual?'Best value · billed yearly':'Flexible monthly access'}</Text></View><Text style={{color:c.text,fontSize:16,fontWeight:'700'}}>{plan.product.priceString}</Text></Pressable>; }
