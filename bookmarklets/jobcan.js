const year = new Date().getYear() + 1900 + "";
const officeSelector =`[href="/clients/offices"]`;
const isPhotocreate = document.querySelector(officeSelector).innerText === "株式会社フォトクリエイト";
const div = document.createElement("div");
div.style="width:80%;z-index:9999;text-align:center;position:absolute;left:100;top:100;background-color:#FFF;margin:50px;padding:50px;";
div.innerHTML= "<p>読込中</p>";
const header = document.querySelector("header");
const body = document.querySelector("body");
header.appendChild(div);

// 給与データ
const json = JSON.parse(ReactRailsUJS.findDOMNodes("div")[0].dataset.reactProps);
// 下記が交通費を抜いたやつ
const payment_list = json.values.all_payrolls.filter(p => p.payment_date.substring(0, 4) === year).reduce( (acc, cv) => {acc.push(cv.income_tax_related_amount_exclude_no_exemption_commuting); return acc; },[]);
// 10月給与を取得し、その3倍を加算したものになる
const oct_payment = json.values.all_payrolls.filter(p => p.payment_date.substring(0, 7) === year + "-10").reduce( (acc, cv) => { acc += cv.income_tax_related_amount_exclude_no_exemption_commuting; return acc; }, 0);
// payment_listには10月を含んでいるので10月分はあと2回加算
const total = oct_payment * 2 + payment_list.reduce((acc, cv) => acc+cv, 0);

// 計算式を算出
// label, payment_amount
const formula = json.values.all_payrolls.filter(p => p.payment_date.substring(0,4) === year).sort().reverse().map( (p) => {
    if (p.payment_date.substring(5, 7) !== "10") {
        return `${p.label} 総支給額: (${p.payment_amount}) - 非課税通勤手当(${p.payment_amount-p.income_tax_related_amount_exclude_no_exemption_commuting}) = ${p.income_tax_related_amount_exclude_no_exemption_commuting}`;
    } else {
        return `${p.label} (総支給額: (${p.payment_amount}) - 非課税通勤手当(${p.payment_amount-p.income_tax_related_amount_exclude_no_exemption_commuting})) ✕ 3 = ${p.income_tax_related_amount_exclude_no_exemption_commuting*3}`;
    }
}).join("\n");
const innerHtml = `<h1>トータル金額：${total}</h1>
<hr/>
<p>計算式です</p>
<div>
<textarea rows="15" cols="80">${formula}</textarea>
</div>`;
div.innerHTML = innerHtml;

// 賞与データ
fetch("/employees/my_data/bonus").then((response) => response.text()).then((html) => {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, "text/html");
    const props = doc.querySelector("div").getAttribute("data-react-props");

    const json = JSON.parse(props);
    if (json.error_status === "not_found") {
        return;
    }
    // 合計金額算出
    const bonus = json.values.all_bonus.filter( o => o.pay_on.substring(0, 4) === year);
    if (bonus.length === 0) {
        return;
    }
    // 11月賞与の見込み（フォトクリのみ)は4月分を反映
    let apr_bonus = json.values.all_bonus.filter( o => o.pay_on.substring(0,7) === year + "-04");
    let apr_bonus_value = 0;
    if (apr_bonus.length > 0) {
        apr_bonus_value = apr_bonus[0];
    }

    const nov_bonus = apr_bonus_value > 0 ? (isPhotocreate ? json.values.all_bonus.filter( o => o.pay_on.substring(0,7) === year + "-04")[0].total_taxable_target_amount : 0) -0: 0;
    const bonusTotal = bonus.reduce( (acc, cv) => { acc.push(cv.total_taxable_target_amount); return acc; },[]).reduce( (acc, cv) => acc+cv, 0) + nov_bonus;
    const bonusFormula = bonus.map( (o) => {
        if (nov_bonus > 0 && o.pay_on.substring(0,7) === year + "-04") {
            return `${o.label.trim()} : ${o.total_taxable_target_amount} ✕ 2 = ${o.total_taxable_target_amount*2}`
        } else {
            return `${o.label.trim()} = ${o.total_taxable_target_amount}`
        }
    }).join("\n");

    const innerHtml = `<h1>トータル金額：${total+bonusTotal} (${total} + ${bonusTotal})</h1>
    <hr/>
    <p>計算式です</p>
    <div>
    <textarea rows="15" cols="80">${formula}\n${bonusFormula}</textarea>
    </div>`;
    div.innerHTML = innerHtml;
});

