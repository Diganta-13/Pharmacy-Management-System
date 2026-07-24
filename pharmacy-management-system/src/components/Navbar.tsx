export default function Navbar(){

return(

<header className="h-16 bg-white border-b flex items-center justify-between px-6">


<h2 className="text-xl font-semibold">
Dashboard
</h2>


<div className="flex items-center gap-4">


<button className="px-4 py-2 rounded-full border text-blue-600">
Administrator
</button>


<button className="px-4 py-2 rounded-full border text-orange-500">
⚠ 4 alerts
</button>


<div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
A
</div>


</div>


</header>


)

}