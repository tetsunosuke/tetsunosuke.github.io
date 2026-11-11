(function () {
    // ジョブカン給与の給与明細画面以外では実行せず、遷移リンクを表示する
    if (location.host !== "payroll.jobcan.jp" || location.pathname.split("/").filter(Boolean).join("/") !== "employees/my_data/payslips") {
        (function () {
            var url = "https://payroll.jobcan.jp/employees/my_data/payslips";
            var old = document.getElementById("jobcan-bm-notice");
            if (old) { old.remove(); }
            var box = document.createElement("div");
            box.id = "jobcan-bm-notice";
            box.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;width:90%;max-width:520px;box-sizing:border-box;background:#fff;color:#222;border:3px solid #d33;border-radius:8px;padding:20px 24px;font:16px/1.6 sans-serif;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.4);";
            var msg = document.createElement("p");
            msg.style.cssText = "margin:0 0 14px;";
            msg.textContent = "このブックマークレットは、ジョブカン給与の「給与明細」画面で実行してください。";
            var link = document.createElement("a");
            link.href = url;
            link.textContent = "ジョブカン給与の給与明細画面を開く";
            link.style.cssText = "display:inline-block;padding:10px 18px;background:#0b6bcb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;";
            var small = document.createElement("p");
            small.style.cssText = "margin:12px 0 0;font-size:12px;color:#555;word-break:break-all;";
            small.textContent = url;
            var close = document.createElement("button");
            close.type = "button";
            close.textContent = "閉じる";
            close.style.cssText = "margin-top:12px;padding:4px 14px;cursor:pointer;";
            close.onclick = function () { box.remove(); };
            box.appendChild(msg);
            box.appendChild(link);
            box.appendChild(small);
            box.appendChild(close);
            (document.body || document.documentElement).appendChild(box);
        })();
        return;
    }

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
        // 11月賞与の見込み（フォトクリのみ)は5月分を反映
        let apr_bonus = json.values.all_bonus.filter( o => o.pay_on.substring(0,7) === year + "-05");
        let apr_bonus_value = 0;
        if (apr_bonus.length > 0) {
            apr_bonus_value = apr_bonus[0].total_taxable_target_amount;
        }
    
        const nov_bonus = apr_bonus_value > 0 ? (isPhotocreate ? json.values.all_bonus.filter( o => o.pay_on.substring(0,7) === year + "-05")[0].total_taxable_target_amount : 0) -0: 0;
        const bonusTotal = bonus.reduce( (acc, cv) => { acc.push(cv.total_taxable_target_amount); return acc; },[]).reduce( (acc, cv) => acc+cv, 0) + nov_bonus;
        const bonusFormula = bonus.map( (o) => {
            if (nov_bonus > 0 && o.pay_on.substring(0,7) === year + "-05") {
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
    
})();
