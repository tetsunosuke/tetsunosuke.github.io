// clipboard
let global = window;
global.COPY_TO_CLIPBOARD = global.COPY_TO_CLIPBOARD || {}
global.COPY_TO_CLIPBOARD.copyToClipboard = function(value) {
    let copyFrom = document.createElement("textarea");
    copyFrom.textContent = value;
    let bodyElm = document.getElementsByTagName("body")[0];
    bodyElm.appendChild(copyFrom);
    copyFrom.select();
    let retVal = document.execCommand('copy');
    bodyElm.removeChild(copyFrom);
    return retVal;
};


const json = JSON.parse(ReactRailsUJS.findDOMNodes("div")[0].dataset.reactProps);
// const payment_list = json.values.all_payrolls.filter(p => p.payment_date>= '2020-01-01').reduce( (acc, cv) => {acc.push(cv.payment_amount); return acc; },[]);
// 下記が交通費を抜いたやつ
const payment_list = json.values.all_payrolls.filter(p => p.payment_date>= '2020-01-01').reduce( (acc, cv) => {acc.push(cv.income_tax_related_amount_exclude_no_exemption_commuting); return acc; },[]);
const oct_payment = payment_list.shift();
const total = oct_payment * 3 + payment_list.reduce((acc, cv) => acc+cv, 0);

// 念の為計算式を算出
// label, payment_amount
const formula = json.values.all_payrolls.filter(p => p.payment_date >= '2020-01-01').sort().reverse().map( (p) => {
    /*
    return {
        "支給日": p.label,
        "総支給額" : p.payment_amount,
        "非課税通勤手当": p.payment_amount - p.income_tax_related_amount_exclude_no_exemption_commuting
    }
    */
    if (p.payment_date.substring(5, 7) !== "10") {
        return `${p.label} 総支給額: (${p.payment_amount}) - 非課税通勤手当(${p.payment_amount-p.income_tax_related_amount_exclude_no_exemption_commuting} ) = ${p.income_tax_related_amount_exclude_no_exemption_commuting}`;
    } else {
        return `${p.label} (総支給額: (${p.payment_amount}) - 非課税通勤手当(${p.payment_amount-p.income_tax_related_amount_exclude_no_exemption_commuting})) ✕ 3 = ${p.income_tax_related_amount_exclude_no_exemption_commuting*3}`;
    }
}).join("\n");
alert(`トータル金額：${total} （クリップボードにもコピーされます）
計算式です。念の為確認してください。
${formula}`);

const result = global.COPY_TO_CLIPBOARD.copyToClipboard(total);
if (!result) {
    alert("クリップボードへの登録に失敗した可能性があります。もう一度押してください");
}
