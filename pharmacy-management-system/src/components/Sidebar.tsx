const menus = [
  "Dashboard",
  "Medicines",
  "Categories",
  "Stock",
  "Purchase",
  "Sales & Billing",
  "Suppliers",
  "Customers",
  "Employee Mgmt.",
  "Reports",
  "Expiry Alerts",
  "Low Stock Alerts",
  "Settings",
];


export default function Sidebar(){

return (

<aside className="w-64 bg-[#12395b] text-white min-h-screen p-5">


<div className="mb-8">

<h1 className="text-xl font-bold">
Green Life Pharmacy
</h1>

<p className="text-xs text-blue-200">
Management System
</p>

</div>



<p className="text-xs text-blue-300 mb-4">
ADMIN PANEL
</p>


<nav className="space-y-2">

{
menus.map((item,index)=>(

<div
key={index}
className={`px-4 py-3 rounded-lg cursor-pointer
${index===0 ? "bg-blue-600" : "hover:bg-blue-700"}
`}
>

{item}

</div>

))
}

</nav>



<div className="absolute bottom-5">

<p className="font-semibold">
Admin User
</p>

<p className="text-xs text-blue-200">
admin@greenlifepharmacy.com
</p>

</div>


</aside>


)

}