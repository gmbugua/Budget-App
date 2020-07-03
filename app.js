/**
 *  Main applicaiton split into modular components.
 */

function thousands_separators(num) {
  var num_parts = num.toString().split(".");
  num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return num_parts.join(".");
}

var nodeListForEach = function (list, callback) {
  for (var i = 0; i < list.length; i++) {
    callback(list[i], i);
  }
};

// Budget Controller - IIFE Responsible for Budget Data Management
var BudgetController = (() => {
  // **** PRIVATE ****

  // Rounds Numbers to a specified decimal place
  // PARAMETERS: num    --> any Number, but most likely a Float
  //             digits --> decimal places
  // RETURNS: A number at a specified precision
  function round(num, digits) {
    return Number(Math.round(num + "e" + digits) + "e-" + digits);
  }

  // ITEM OBJECT DEFINITION
  // An Item is any  budget relevant financial information.
  // i.e. an expense such as a bill, or income like a tax return
  // CONSTRUCTOR PARAMETERS: Description, Value, Type
  // Item.desc --> a name describing what the item is and its relevance
  // Item.val  --> the cash value of the item in Dollars
  // Item.typ  --> describes where the item should go when organizing the budget
  // * All parameters are user inputed through the DOM *
  class Item {
    constructor(description, value, type) {
      this.desc = description;
      this.val = value;
      this.typ = type;

      // Uses the Items Array Index as the ID for the Item
      this.id = undefined;
      this.percent = undefined;
    }

    setItemMarkUp = () => {
      // Assigns Proper HTML Markup to an Item
      // Based on Item Type
      if (this.typ == "inc") {
        this.markUp = `
                <div class="item clearfix" id="income-${this.id}">
                    <div class="item__description">${this.desc}</div>
                    <div class="right clearfix">
                        <div class="item__value">+ ${this.val}</div>
                        <div class="item__delete">
                            <button class="item__delete--btn" >
                                <i class="ion-ios-close-outline"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      } else if (this.typ == "exp") {
        this.markUp = `
                <div class="item clearfix" id="expense-${this.id}">
                    <div class="item__description">${this.desc}</div>
                    <div class="right clearfix">
                        <div class="item__value">- ${this.val}</div>
                        <div class="item__percentage">${this.percent}</div>
                        <div class="item__delete">
                            <button class="item__delete--btn">
                                <i class="ion-ios-close-outline"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      }
    };
  }

  // REPORT OBJECT DEFINITION
  // Reports are where items go.
  // Report.name = name describing what type of items belong in it
  // Report.items = an array that holds items in sequential order of joining the Report
  // Report.repTot = the total value of the items in the report (dollar)
  class Report {
    constructor(name) {
      this.name = name;
      this.items = new Array(0);
      this.rpTot = 0;
    }

    updateItemID = (item) => {
      this.items[this.items.indexOf(item)].id = this.items.indexOf(item);
    };

    // Adds the Item to the Report Items List
    // Sets item syntax using the setItemMarkUp() function
    // Gives the item a unique id
    // PARAMETERS: instance of Item Object
    // RETURNS: NULL
    addItem = (item) => {
      // Add item to the report's items array
      this.items.push(item);

      this.updateItemID(item);

      // Update the value total of the report
      // i.o the reports total fraction of the budget
      this.rpTot += item.val;

      // Choose item HTML markup template based on Report
      item.setItemMarkUp();
    };

    // remove target item from items list of report
    // if it exists
    delReportItem = (item) => {
      if (this.items.includes(item)) {
        this.items.splice(item.id, 1);
      }
      this.items.forEeach((item) => {
        this.updateItemID(item);
        item.setItemMarkUp();
      });
    };
  }

  // Income Expense Budget Object
  // PARAMETERS: Income Report , Expense Report
  class IncomeExpenseBudget {
    constructor(IncReport, ExpReport) {
      this.IncRp = IncReport;
      this.ExpRp = ExpReport;

      this.BudgetTot = 0;
      this.NetIncome = 0;

      this.IncPercent = 0;
      this.ExpPercent = 0;
    }

    updateItemPercent = (item) => {
      let p, c, d;
      d = (this.IncRp.rpTot - item.val) / this.IncRp.rpTot;
      p = round((1 - d) * 100, 0);
      item.percent = p <= 100 ? `${p}%` : "Over Budget";
    };

    updateBudget = () => {
      this.NetIncome = this.IncRp.rpTot - this.ExpRp.rpTot;

      this.ExpRp.items.forEach((item) => {
        this.updateItemPercent(item);
        item.setItemMarkUp();
      });

      if (this.ExpRp.rpTot == 0) {
        this.ExpPercent = 0;
      } else {
        let p, c, d;
        d = (this.IncRp.rpTot - this.ExpRp.rpTot) / this.IncRp.rpTot;
        c = 1 - d;
        this.ExpPercent = round((1 - d) * 100, 0);
      }
    };
  }

  // **** PUBLIC ****
  return {
    // These are all functions that allow our private obejcts
    // To be accessed publicly by the other Modules
    // PARAMETERS: Arguments of returned object construture
    // RETURN: A private Object Constructure
    Report: (name) => new Report(name),
    Item: (description, value, type) => new Item(description, value, type),
    IncomeExpenseBudget: (IncReport, ExpReport) =>
      new IncomeExpenseBudget(IncReport, ExpReport),
  };
})();

var UIController = ((BudgetCtrl) => {
  // **** PRIVATE ****

  // DOMstrList holds the majoryity of class selectors used to manipulate the DOM
  // If we change a class on the doc, we only have to change it in one place
  function DOMStrList() {
    this.inBtn = ".add__btn";
    this.delBtn = ".item__delete--btn";

    this.inType = ".add__type";
    this.inValue = ".add__value";
    this.inDesc = ".add__description";

    this.GlobalBudgetVal = ".budget__value";
    this.IncReportVal = ".budget__income--value";
    this.ExpReportVal = ".budget__expenses--value";
    this.ExpPercentVal = ".budget__expenses--percentage";

    this.container = ".container";
  }

  // ----- DOM INITIALIZATION -----

  // Updates the budget month to current
  function setMonth() {
    var date, months;

    date = new Date(); // Date Object -> getMonth() -> an integer in 0-11 -> Month Index
    months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "June",
      "July",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ]; // Month Array 0 - 11

    // Selects the Month by class and changes the text content based on the current month index
    document.querySelector(".budget__title--month").textContent =
      months[date.getMonth()] + " , " + date.getFullYear();
  }

  // Reset the DOM
  function resetDOM() {
    // Selects all Budget Value Elements + Percentages and resets them to 0
    document.querySelector(".budget__value").textContent = "0";

    document.querySelector(".budget__income--value").textContent = "0";

    document.querySelector(".budget__expenses--value").textContent = "0";
    document.querySelector(".budget__expenses--percentage").textContent = "-1";
  }

  // **** PUBLIC ****

  return {
    // Initializes DOM
    // Calls SetMonth(), resetDOM()
    // PARAMETERS: NONE
    // RETURNS: NULL
    initDOM: function () {
      setMonth();
      resetDOM();
    },

    // PARAMETERS: NONE;
    // RETURNS: an instance of the  DOMstrList() Object
    getDOMStrList: function () {
      return new DOMStrList();
    },

    // Resets user input fields on the DOM
    // Specifically, Description and Value Inputs
    // PARAMETERS: DOMlist --> instance of DOMstrList Object
    // RETURNS: NULL
    rsetInputs: function (DOMlist) {
      var fields, fieldsArr;

      // returns a list of field elements and their value
      fields = document.querySelectorAll(
        DOMlist.inDesc + ", " + DOMlist.inValue
      );

      // convert list to array, by tricking it.
      fieldsArr = Array.prototype.slice.call(fields);

      // loops over elements of the input
      // applies anonymous function to each one
      fieldsArr.forEach(function (curr, index, arr) {
        curr.value = "";
      });

      // reset focus to be the description element
      fieldsArr[0].focus();
    },

    // Retrieves values from user input fields
    // Creates an Item Object using user input
    // PARAMETERS: DOMlist --> instance of DOMstrList Object
    // RETURNS: Defined Item Object
    getInputItem: function (DOMlist) {
      // INC or EXP
      var t = document.querySelector(DOMlist.inType);
      var type = t.options[t.selectedIndex].value;

      // DESC
      var desc = document.querySelector(DOMlist.inDesc).value;

      // VALUE
      var value = Number(document.querySelector(DOMlist.inValue).value);

      return BudgetCtrl.Item(desc, value, type);
    },

    // Based on the Item type i.e expense or income:
    // The function selects the appropriate report list
    // then inserts the Item's html markup under it.
    // PARAMETERS: item --> instance of an Item Object
    // RETURNS: NULL
    dispItemOnDOM: function (item) {
      if (item.typ == "exp") {
        var el = document.getElementsByClassName("expenses__list")[0];
        el.insertAdjacentHTML("beforeend", item.markUp);
      } else {
        var el = document.getElementsByClassName("income__list")[0];
        el.insertAdjacentHTML("beforeend", item.markUp);
      }
    },

    // Displays Budget Data Structure Elements on DOM
    // PARAEMETERS: DOMlist
    // RETURNS: Budget
    dispBudgetOnDom: function (DOMlist, Budget) {
      if (Budget.NetIncome > 0) {
        document.querySelector(DOMlist.GlobalBudgetVal).textContent =
          "$ " + "+" + thousands_separators(Budget.NetIncome);
        document.querySelector(DOMlist.GlobalBudgetVal).style.color = "#28B9B5";
      } else if (Budget.NetIncome == 0) {
        document.querySelector(DOMlist.GlobalBudgetVal).textContent =
          "$ " + thousands_separators(Budget.NetIncome);
        document.querySelector(DOMlist.GlobalBudgetVal).style.color = "#28B9B5";
      } else {
        document.querySelector(DOMlist.GlobalBudgetVal).textContent =
          "$ " + thousands_separators(Budget.NetIncome);
        document.querySelector(DOMlist.GlobalBudgetVal).style.color = "red";
      }

      document.querySelector(DOMlist.IncReportVal).textContent =
        "$ " + thousands_separators(Budget.IncRp.rpTot);
      document.querySelector(DOMlist.ExpReportVal).textContent =
        "$ " + thousands_separators(Budget.ExpRp.rpTot);

      if (Budget.ExpPercent >= 0) {
        document.querySelector(DOMlist.ExpPercentVal).textContent =
          Budget.ExpPercent + "%";
      }
    },
    removeItem: function (id) {
      var parent, child;
      child = document.getElementById(id);
      parent = child.parentNode;
      parent.removeChild(child);
    },
  };
})(BudgetController);

var AppController = ((UIctrl, BudgetCtrl) => {
  // **** PRIVATE ****

  // REPORTS
  var GlobalBudget = BudgetCtrl.IncomeExpenseBudget(
    BudgetCtrl.Report("Income"),
    BudgetCtrl.Report("Expense")
  );

  var DOMstr = UIctrl.getDOMStrList();

  // Sets up our Event Listeners
  // Used during Initialization
  // PARAEMTERS: NONE
  // RETURNS: NULL
  function setUpEventListeners() {
    document.querySelector(DOMstr.inBtn).addEventListener("click", fillReport);

    document.addEventListener("keypress", function (event) {
      if (event.keycode === 13 || event.which === 13) {
        fillReport();
      }
    });

    document
      .querySelector(DOMstr.container)
      .addEventListener("click", delItemFromDOM);
  }

  // Adds items to respective report and updates the DOM
  // PARAMETERS: NONE
  // RETURNS: NULL
  function fillReport() {
    var item = UIctrl.getInputItem(DOMstr);

    if (item.desc.length > 0 && !isNaN(item.val) && item.val > 0) {
      if (item.typ == "inc") {
        GlobalBudget.IncRp.addItem(item);
      } else if (item.typ == "exp") {
        GlobalBudget.ExpRp.addItem(item);
      }

      // UPDATE DOM INFORMATION AND BUDGET
      GlobalBudget.updateBudget();
      UIctrl.dispBudgetOnDom(DOMstr, GlobalBudget);
      UIctrl.dispItemOnDOM(item);
      UIctrl.rsetInputs(DOMstr);
    }
  }

  var delItemFromDOM = function (event) {
    var elmInfo = event.target.parentNode.tagName;
    if (elmInfo == "BUTTON") {
      var elmID = event.target.id;
      var t = event.target.id.split("-");

      // delete item from data structure if it exists
      if (t[0] == "income") {
        GlobalBudget.IncRp.delReportItem(parseInt(t[1]));
      } else if (t[0] == "expense") {
        GlobalBudget.ExpRp.delReportItem(parseInt(t[1]));
      }

      // UIctrl.removeItem(elmID);
      // GlobalBudget.updateBudget();
      // UIctrl.dispBudgetOnDom(DOMstr, GlobalBudget);
      // UIctrl.rsetInputs(DOMstr);
    }
  };

  // **** PUBLIC ****

  return {
    init: function () {
      UIctrl.initDOM();
      setUpEventListeners();
    },
  };
})(UIController, BudgetController);

AppController.init();
