import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { ChooseChar, ChooseChar_doudizhu, ChooseChar_versus, ChooseChar_doudizhu_huanle } from "./ChooseChar.js";
import { SelChrFrame } from "./ChooseChar.js";
import { Character2 } from "./ChooseChar.js";
import { Timebar } from "./other.js";

dzxy.Timebar = Timebar;
dzxy.Character2 = Character2;
dzxy.SelChrFrame = SelChrFrame;
dzxy.chooseChar = new ChooseChar();
dzxy.chooseChar_doudizhu = new ChooseChar_doudizhu();
dzxy.ChooseChar_doudizhu_huanle = new ChooseChar_doudizhu_huanle();
dzxy.chooseChar_versus = new ChooseChar_versus();
export class ChooseChar_mod {
  /**
   * 基于1.10.14版的选将函数修改
   * 修改过的地方都用了'修改'标注
   * 除了game.chooseCharacterHuanle
   */
  static modify() {
    //换位
    let originSwapSeat = game.swapSeat;
    game.swapSeat = (...args) => {
      originSwapSeat.apply(this, args);
      //补充↓
      if (lib.config.mode == 'versus') {
        let layoutList = {
          '1': 'next',
          '3': 'previous',
          '2': 'opposite',
        }
        let playersAll = game.players.slice().addArray(game.dead.slice());
        playersAll.sortBySeat(game.me);
        for (let i = 1; i < playersAll.length; i++) {
          if (playersAll[i].side == game.me.side) {
            ui.arena.dataset.layoutTwotwo = layoutList[String(i)];
            break;
          }
        }
      }
      else if (lib.config.mode == 'doudizhu') {
        dzxy.chooseChar_doudizhu.updateLayout();
      }
    }
    //查看手牌
    let dcdStyle = lib.config['extension_十周年UI_newDecadeStyle'];
    if (game.hasExtension('十周年UI') && lib.config[`${dzxy.dz}PWOptimization`] && (dcdStyle == 'off' || dcdStyle == 'othersOn')) {
      lib.skill._lookCard_create = {
        trigger: {
          global: 'gameDrawBefore',
          // player:['changeSkillsEnd','changeCharacterEnd'],
        },
        priority: 99,
        firstDo: true,
        charlotte: true,
        forced: true,
        filter: function (event, player) {
          return player.node.showCards;
        },
        content: function () {
          player.node.showCards.onclick = function () {
            let pcard = player.getCards('h');
            if (pcard.length <= 0) return;
            let bigBg = dzxy.create.bigBg(ui.window, false, () => bigBg.remove());
            let bg = ui.create.div('.dz-icon-tip.view-card', bigBg);
            bg.addEventListener('click', evt => evt.stopPropagation())
            ui.create.div('.dz-title', '队友手牌', bg);
            let cards = ui.create.div('.view-cards', bg);
            dzxy.scroll_lr(cards, 150);
            //（牌数-1）*间距+1牌宽=总长
            let gap = (440 - 79) / (pcard.length - 1);
            if (gap > 79) gap = 79;
            if (gap < 30) gap = 30;
            for (let i = 0; i < pcard.length; i++) {
              if (get.is.shownCard(pcard[i]) || player.isUnderControl(true) || game.me?.hasSkillTag("viewHandcard", null, player, true)) {
                let card = ui.create.card(cards, 'noclick', true).init(pcard[i]);
                card.style.left = gap * i + 'px';
              }
            };
          }
        }
      }
    }
    if (!dzxy.isModeBeautified()) return;
    if (lib.config.mode == 'identity') {
      game.chooseCharacter = function () {
        if (_status.mode == "purple") {
          game.chooseCharacterPurple();
          return;
        }
        var next = game.createEvent("chooseCharacter");
        next.showConfig = true;
        next.addPlayer = function (player) {
          var list = get.identityList(game.players.length - 1);
          var list2 = get.identityList(game.players.length);
          for (var i = 0; i < list.length; i++) list2.remove(list[i]);
          player.identity = list2[0];
          player.setIdentity("cai");
        };
        next.removePlayer = function () {
          return game.players.randomGet(game.me, game.zhu);
        };
        next.ai = function (player, list, list2, back) {
          if (_status.brawl && _status.brawl.chooseCharacterAi) {
            if (_status.brawl.chooseCharacterAi(player, list, list2, back) !== false) {
              return;
            }
          }
          var stratagemMode = _status.event.stratagemMode;
          if (_status.event.zhongmode) {
            var listc = list.slice(0, 2);
            for (var i = 0; i < listc.length; i++) {
              var listx = lib.characterReplace[listc[i]];
              if (listx && listx.length) listc[i] = listx.randomGet();
            }
            if (get.config("double_character")) {
              player.init(listc[0], listc[1]);
            } else {
              player.init(listc[0]);
            }
            if (player.identity == "mingzhong") {
              if (!player.isInitFilter("noZhuHp")) {
                player.hp++;
                player.maxHp++;
                player.update();
              }
            }
          } else if (player.identity == "zhu" && !stratagemMode) {
            list2.randomSort();
            var choice, choice2;
            if (!_status.event.zhongmode && Math.random() - 0.8 < 0 && list2.length) {
              choice = list2[0];
              choice2 = list[0];
              if (choice2 == choice) {
                choice2 = list[1];
              }
            } else {
              choice = list[0];
              choice2 = list[1];
            }
            if (lib.characterReplace[choice] && lib.characterReplace[choice].length)
              choice = lib.characterReplace[choice].randomGet();
            if (lib.characterReplace[choice2] && lib.characterReplace[choice2].length)
              choice2 = lib.characterReplace[choice2].randomGet();
            if (get.config("double_character")) {
              player.init(choice, choice2);
            } else {
              player.init(choice);
            }
            if (game.players.length > 4) {
              if (!player.isInitFilter("noZhuHp")) {
                player.hp++;
                player.maxHp++;
                player.update();
              }
            }
          } else if (
            player.identity == "zhong" &&
            (Math.random() < 0.5 || ["sunliang", "key_akane"].includes(game.zhu.name)) &&
            !stratagemMode
          ) {
            var listc = list.slice(0);
            for (var i = 0; i < listc.length; i++) {
              var listx = lib.characterReplace[listc[i]];
              if (listx && listx.length) listc[i] = listx.randomGet();
            }
            var choice = 0;
            for (var i = 0; i < listc.length; i++) {
              if (lib.character[listc[i]][1] == game.zhu.group) {
                choice = i;
                break;
              }
            }
            if (get.config("double_character")) {
              player.init(listc[choice], listc[choice == 0 ? choice + 1 : choice - 1]);
            } else {
              player.init(listc[choice]);
            }
          } else {
            var listc = list.slice(0, 2);
            for (var i = 0; i < listc.length; i++) {
              var listx = lib.characterReplace[listc[i]];
              if (listx && listx.length) listc[i] = listx.randomGet();
            }
            if (get.config("double_character")) {
              player.init(listc[0], listc[1]);
            } else {
              player.init(listc[0]);
            }
          }
          if (back) {
            list.remove(get.sourceCharacter(player.name1));
            list.remove(get.sourceCharacter(player.name2));
            for (var i = 0; i < list.length; i++) {
              back.push(list[i]);
            }
          }
          if (typeof lib.config.test_game == "string" && player == game.me.next) {
            if (lib.config.test_game != "_")
              player.init(lib.config.test_game);
          }
          if (get.is.double(player.name1)) {
            player._groupChosen = true;
            player.group = get.is.double(player.name1, true).randomGet();
            player.node.name.dataset.nature = get.groupnature(player.group);
          } else if (get.config("choose_group") && player.group == "shen" && !player.isUnseen(0)) {
            var list = lib.group.slice(0);
            list.remove("shen");
            if (list.length)
              player.group = (function () {
                if (_status.mode != "zhong" && game.zhu && game.zhu.group) {
                  if (
                    [
                      "re_zhangjiao",
                      "liubei",
                      "re_liubei",
                      "caocao",
                      "re_caocao",
                      "sunquan",
                      "re_sunquan",
                      "zhangjiao",
                      "sp_zhangjiao",
                      "caopi",
                      "re_caopi",
                      "liuchen",
                      "caorui",
                      "sunliang",
                      "sunxiu",
                      "sunce",
                      "re_sunben",
                      "ol_liushan",
                      "re_liushan",
                      "key_akane",
                      "dongzhuo",
                      "re_dongzhuo",
                      "ol_dongzhuo",
                      "jin_simashi",
                      "caomao",
                    ].includes(game.zhu.name)
                  )
                    return game.zhu.group;
                  if (game.zhu.name == "yl_yuanshu") {
                    if (player.identity == "zhong") list.remove("qun");
                    else return "qun";
                  }
                  if (
                    [
                      "sunhao",
                      "xin_yuanshao",
                      "re_yuanshao",
                      "re_sunce",
                      "ol_yuanshao",
                      "yuanshu",
                      "jin_simazhao",
                      "liubian",
                    ].includes(game.zhu.name)
                  ) {
                    if (player.identity != "zhong") list.remove(game.zhu.group);
                    else return game.zhu.group;
                  }
                }
                return list.randomGet();
              })();
          }
          player.node.name.dataset.nature = get.groupnature(player.group);
        };
        next.setContent(function () {
          "step 0";
          ui.arena.classList.add("choose-character");
          var i;
          var list;
          var list2 = [];
          var list3 = [];
          var list4 = [];
          var identityList;
          var chosen = lib.config.continue_name || [];
          game.saveConfig("continue_name");
          event.chosen = chosen;
          if (_status.mode == "zhong") {
            event.zhongmode = true;
            identityList = ["zhu", "zhong", "mingzhong", "nei", "fan", "fan", "fan", "fan"];
          } else {
            if (_status.mode == "stratagem") event.stratagemMode = true;
            identityList = get.identityList(game.players.length);
          }
          var stratagemMode = event.stratagemMode;
          var addSetting = function (dialog) {
            dialog.add("选择身份").classList.add("add-setting");
            var table = document.createElement("div");
            table.classList.add("add-setting");
            table.style.margin = "0";
            table.style.width = "100%";
            table.style.position = "relative";
            var listi;
            if (event.zhongmode) {
              listi = ["random", "zhu", "mingzhong", "zhong", "fan", "nei"];
            } else {
              listi = ["random", "zhu", "zhong", "fan", "nei"];
              if (get.config("enable_commoner") && !event.stratagemMode) listi.push("commoner");
            }

            for (var i = 0; i < listi.length; i++) {
              var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
              td.link = listi[i];
              if (td.link === game.me.identity) {
                td.classList.add("bluebg");
              }
              table.appendChild(td);
              td.innerHTML = "<span>" + get.translation(listi[i] + "2") + "</span>";
              td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
                if (_status.dragged) return;
                if (_status.justdragged) return;
                _status.tempNoButton = true;
                setTimeout(function () {
                  _status.tempNoButton = false;
                }, 500);
                var link = this.link;
                if (game.zhu) {
                  if (link != "random") {
                    _status.event.parent.fixedseat = get.distance(
                      game.me,
                      game.zhu,
                      "absolute"
                    );
                  }
                  if (game.zhu.name) game.zhu.uninit();
                  delete game.zhu.isZhu;
                  delete game.zhu.identityShown;
                }
                var current = this.parentNode.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                current = _status.cheat_seat || seats.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                if (link == "random") {
                  if (event.zhongmode) {
                    link = ["zhu", "zhong", "nei", "fan", "mingzhong"].randomGet();
                  } else {
                    var listi = ["zhu", "zhong", "nei", "fan"];
                    if (get.config("enable_commoner") && !event.stratagemMode)
                      listi.push("commoner");
                    link = listi.randomGet();
                  }
                  for (var i = 0; i < this.parentNode.childElementCount; i++) {
                    if (this.parentNode.childNodes[i].link == link) {
                      this.parentNode.childNodes[i].classList.add("bluebg");
                    }
                  }
                } else {
                  this.classList.add("bluebg");
                }
                num = get.config("choice_" + link);
                if (event.zhongmode) {
                  num = 6;
                  if (link == "zhu" || link == "nei" || link == "mingzhong") {
                    num = 8;
                  }
                }
                _status.event.parent.swapnodialog = function (dialog, list) {
                  var buttons = ui.create.div(".buttons");
                  var node = dialog.buttons[0].parentNode;
                  dialog.buttons = ui.create.buttons(list, "characterx", buttons);
                  dialog.content.insertBefore(buttons, node);
                  buttons.addTempClass("start");
                  node.remove();
                  game.uncheck();
                  game.check();
                  if (event.stratagemMode) return;
                  for (var i = 0; i < seats.childElementCount; i++) {
                    if (
                      get.distance(game.zhu, game.me, "absolute") ===
                      seats.childNodes[i].link
                    ) {
                      seats.childNodes[i].classList.add("bluebg");
                    }
                  }
                };
                _status.event = _status.event.parent;
                _status.event.step = 0;
                _status.event.identity = link;
                if (!event.stratagemMode) {
                  if (link != (event.zhongmode ? "mingzhong" : "zhu")) {
                    seats.previousSibling.style.display = "";
                    seats.style.display = "";
                  } else {
                    seats.previousSibling.style.display = "none";
                    seats.style.display = "none";
                  }
                }
                game.resume();
              });
            }
            dialog.content.appendChild(table);

            dialog.add("选择座位").classList.add("add-setting");
            var seats = document.createElement("div");
            seats.classList.add("add-setting");
            seats.style.margin = "0";
            seats.style.width = "100%";
            seats.style.position = "relative";
            for (var i = stratagemMode ? 1 : 2; i <= game.players.length; i++) {
              var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
              td.innerHTML = get.cnNumber(i, true);
              td.link = i - 1;
              seats.appendChild(td);
              if (!stratagemMode && get.distance(game.zhu, game.me, "absolute") === i - 1) {
                td.classList.add("bluebg");
              }
              td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
                if (_status.dragged) return;
                if (_status.justdragged) return;
                if (_status.cheat_seat) {
                  _status.cheat_seat.classList.remove("bluebg");
                  if (_status.cheat_seat == this) {
                    delete _status.cheat_seat;
                    return;
                  }
                }
                if (stratagemMode) {
                  this.classList.add("bluebg");
                  _status.cheat_seat = this;
                } else {
                  if (get.distance(game.zhu, game.me, "absolute") == this.link) return;
                  var current = this.parentNode.querySelector(".bluebg");
                  if (current) {
                    current.classList.remove("bluebg");
                  }
                  this.classList.add("bluebg");
                  for (var i = 0; i < game.players.length; i++) {
                    if (get.distance(game.players[i], game.me, "absolute") == this.link) {
                      game.swapSeat(game.zhu, game.players[i], false);
                      return;
                    }
                  }
                }
              });
            }
            dialog.content.appendChild(seats);
            if (!stratagemMode && game.me == game.zhu) {
              seats.previousSibling.style.display = "none";
              seats.style.display = "none";
            }

            dialog.add(ui.create.div(".placeholder.add-setting"));
            dialog.add(ui.create.div(".placeholder.add-setting"));
            if (get.is.phoneLayout()) dialog.add(ui.create.div(".placeholder.add-setting"));
          };
          var removeSetting = function () {
            var dialog = _status.event.dialog;
            if (dialog) {
              dialog.style.height = "";
              delete dialog._scrollset;
              var list = Array.from(dialog.querySelectorAll(".add-setting"));
              while (list.length) {
                list.shift().remove();
              }
              ui.update();
            }
          };
          event.addSetting = addSetting;
          event.removeSetting = removeSetting;
          event.list = [];
          identityList.randomSort();
          if (event.identity) {
            identityList.remove(event.identity);
            identityList.unshift(event.identity);
            if (event.fixedseat) {
              var zhuIdentity = _status.mode == "zhong" ? "mingzhong" : "zhu";
              if (zhuIdentity != event.identity) {
                identityList.remove(zhuIdentity);
                identityList.splice(event.fixedseat, 0, zhuIdentity);
              }
              delete event.fixedseat;
            }
            delete event.identity;
          } else if (_status.mode != "zhong" && (!_status.brawl || !_status.brawl.identityShown)) {
            var ban_identity = [];
            ban_identity.push(get.config("ban_identity") || "off");
            if (ban_identity[0] != "off") {
              ban_identity.push(get.config("ban_identity2") || "off");
              if (ban_identity[1] != "off") {
                ban_identity.push(get.config("ban_identity3") || "off");
              }
            }
            ban_identity.remove("off");
            if (ban_identity.length) {
              var identityList2 = identityList.slice(0);
              for (var i = 0; i < ban_identity.length; i++) {
                while (identityList2.includes(ban_identity[i])) {
                  identityList2.remove(ban_identity[i]);
                }
              }
              ban_identity = identityList2.randomGet();
              identityList.remove(ban_identity);
              identityList.splice(game.players.indexOf(game.me), 0, ban_identity);
            }
          }
          for (i = 0; i < game.players.length; i++) {
            if (_status.brawl && _status.brawl.identityShown) {
              if (game.players[i].identity == "zhu") game.zhu = game.players[i];
              if (!stratagemMode) game.players[i].identityShown = true;
            } else {
              game.players[i].node.identity.classList.add("guessing");
              game.players[i].identity = identityList[i];
              game.players[i].setIdentity("cai");
              if (event.zhongmode) {
                if (identityList[i] == "mingzhong") {
                  game.zhu = game.players[i];
                } else if (identityList[i] == "zhu") {
                  game.zhu2 = game.players[i];
                }
              } else {
                if (identityList[i] == "zhu") {
                  game.zhu = game.players[i];
                }
              }
              game.players[i].identityShown = false;
            }
          }

          if (
            get.config("special_identity") &&
            !event.zhongmode &&
            !event.stratagemMode &&
            game.players.length == 8
          ) {
            for (var i = 0; i < game.players.length; i++) {
              delete game.players[i].special_identity;
            }
            event.special_identity = [];
            var zhongs = game.filterPlayer(function (current) {
              return current.identity == "zhong";
            });
            var fans = game.filterPlayer(function (current) {
              return current.identity == "fan";
            });
            if (fans.length >= 1) {
              fans.randomRemove().special_identity = "identity_zeishou";
              event.special_identity.push("identity_zeishou");
            }
            if (zhongs.length > 1) {
              zhongs.randomRemove().special_identity = "identity_dajiang";
              zhongs.randomRemove().special_identity = "identity_junshi";
              event.special_identity.push("identity_dajiang");
              event.special_identity.push("identity_junshi");
            } else if (zhongs.length == 1) {
              if (Math.random() < 0.5) {
                zhongs.randomRemove().special_identity = "identity_dajiang";
                event.special_identity.push("identity_dajiang");
              } else {
                zhongs.randomRemove().special_identity = "identity_junshi";
                event.special_identity.push("identity_junshi");
              }
            }
          }

          if (!game.zhu) game.zhu = game.me;
          else {
            if (!stratagemMode) {
              game.zhu.setIdentity();
              game.zhu.identityShown = true;
              game.zhu.node.identity.classList.remove("guessing");
            }
            game.zhu.isZhu = game.zhu.identity == "zhu";
            game.me.setIdentity();
            game.me.node.identity.classList.remove("guessing");
          }
          //选将框分配
          for (i in lib.characterReplace) {
            var ix = lib.characterReplace[i];
            for (var j = 0; j < ix.length; j++) {
              if (chosen.includes(ix[j]) || lib.filter.characterDisabled(ix[j]))
                ix.splice(j--, 1);
            }
            if (ix.length) {
              event.list.push(i);
              list4.addArray(ix);
              if (stratagemMode) {
                list3.push(i);
              } else {
                var bool = false;
                for (var j of ix) {
                  if (lib.character[j].isZhugong) {
                    bool = true;
                    break;
                  }
                }
                (bool ? list2 : list3).push(i);
              }
            }
          }
          for (i in lib.character) {
            if (list4.includes(i)) continue;
            if (chosen.includes(i)) continue;
            if (lib.filter.characterDisabled(i)) continue;
            event.list.push(i);
            list4.push(i);
            if (!stratagemMode && lib.character[i].isZhugong) {
              list2.push(i);
            } else {
              list3.push(i);
            }
          }
          var getZhuList = function () {
            if (stratagemMode) {
              list2.sort(lib.sort.character);
              return list2;
            }
            var limit_zhu = get.config("limit_zhu");
            if (!limit_zhu || limit_zhu == "off") return list2.slice(0).sort(lib.sort.character);
            if (limit_zhu != "group") {
              var num = parseInt(limit_zhu) || 6;
              return list2.randomGets(num).sort(lib.sort.character);
            }
            var getGroup = function (name) {
              var characterReplace = lib.characterReplace[name];
              if (characterReplace && characterReplace[0] && lib.character[characterReplace[0]])
                return lib.character[characterReplace[0]][1];
              return lib.character[name][1];
            };
            var list2x = list2.slice(0);
            list2x.randomSort();
            for (var i = 0; i < list2x.length; i++) {
              for (var j = i + 1; j < list2x.length; j++) {
                if (getGroup(list2x[i]) == getGroup(list2x[j])) {
                  list2x.splice(j--, 1);
                }
              }
            }
            list2x.sort(lib.sort.character);
            return list2x;
          };
          event.list.randomSort();
          _status.characterlist = list4.slice(0).randomSort();
          list3.randomSort();
          if (_status.brawl && _status.brawl.chooseCharacterFilter) {
            _status.brawl.chooseCharacterFilter(event.list, getZhuList(), list3);
          }
          var num = get.config("choice_" + game.me.identity);
          if (event.zhongmode) {
            num = 6;
            if (
              game.me.identity == "zhu" ||
              game.me.identity == "nei" ||
              game.me.identity == "mingzhong"
            ) {
              num = 8;
            }
          }
          if (stratagemMode) {
            list = event.list.slice(0, num);
          } else if (game.zhu != game.me) {
            event.ai(game.zhu, event.list, getZhuList());
            event.list.remove(get.sourceCharacter(game.zhu.name1));
            event.list.remove(get.sourceCharacter(game.zhu.name2));
            if (_status.brawl && _status.brawl.chooseCharacter) {
              list = _status.brawl.chooseCharacter(event.list, num);
              if (list === false || list === "nozhu") {
                list = event.list.slice(0, num);
              }
            } else {
              list = event.list.slice(0, num);
            }
          } else {
            if (_status.brawl && _status.brawl.chooseCharacter) {
              list = _status.brawl.chooseCharacter(getZhuList(), list3, num);
              if (list === false) {
                if (event.zhongmode) {
                  list = list3.slice(0, 6);
                } else {
                  list = getZhuList().concat(list3.slice(0, num));
                }
              } else if (list === "nozhu") {
                list = event.list.slice(0, num);
              }
            } else {
              if (event.zhongmode) {
                list = list3.slice(0, 8);
              } else {
                list = getZhuList().concat(list3.slice(0, num));
              }
            }
          }
          delete event.swapnochoose;
          var dialog;
          if (event.swapnodialog) {
            dialog = ui.dialog;
            event.swapnodialog(dialog, list);
            delete event.swapnodialog;
          } else {
            var str = "选择角色";
            if (_status.brawl && _status.brawl.chooseCharacterStr) {
              str = _status.brawl.chooseCharacterStr;
            }
            dialog = ui.create.dialog(str, "hidden", [list, "characterx"]);
            if (!_status.brawl || !_status.brawl.noAddSetting) {
              if (get.config("change_identity")) {
                addSetting(dialog);
              }
            }
          }
          if (game.me.special_identity) {
            dialog.setCaption("选择角色（" + get.translation(game.me.special_identity) + "）");
            game.me.node.identity.firstChild.innerHTML = get.translation(
              game.me.special_identity + "_bg"
            );
          } else {
            dialog.setCaption("选择角色");
            game.me.setIdentity();
          }
          if (!event.chosen.length) {
            game.me.chooseButton(dialog, true).set("onfree", true).selectButton = function () {
              if (_status.brawl && _status.brawl.doubleCharacter) return 2;
              return get.config("double_character") ? 2 : 1;
            };
            //修改>身份场
            let requireNum = (function () {
              if (_status.brawl && _status.brawl.doubleCharacter) return 2;
              return get.config("double_character") ? 2 : 1;
            })();
            dzxy.chooseChar.openPage(dialog, requireNum);
            //修改<
          } else {
            lib.init.onfree();
          }
          ui.create.cheat = function () {
            _status.createControl = ui.cheat2;
            ui.cheat = ui.create.control("更换", function () {
              if (ui.cheat2 && ui.cheat2.dialog == _status.event.dialog) {
                return;
              }
              if (game.changeCoin) {
                game.changeCoin(-3);
              }
              if (game.zhu != game.me) {
                event.list.randomSort();
                if (_status.brawl && _status.brawl.chooseCharacter) {
                  list = _status.brawl.chooseCharacter(event.list, num);
                  if (list === false || list === "nozhu") {
                    list = event.list.slice(0, num);
                  }
                } else {
                  list = event.list.slice(0, num);
                }
              } else {
                getZhuList().sort(lib.sort.character);
                list3.randomSort();
                if (_status.brawl && _status.brawl.chooseCharacter) {
                  list = _status.brawl.chooseCharacter(getZhuList(), list3, num);
                  if (list === false) {
                    if (event.zhongmode) {
                      list = list3.slice(0, 6);
                    } else {
                      list = getZhuList().concat(list3.slice(0, num));
                    }
                  } else if (list === "nozhu") {
                    event.list.randomSort();
                    list = event.list.slice(0, num);
                  }
                } else {
                  if (event.zhongmode) {
                    list = list3.slice(0, 6);
                  } else {
                    list = getZhuList().concat(list3.slice(0, num));
                  }
                }
              }
              var buttons = ui.create.div(".buttons");
              var node = _status.event.dialog.buttons[0].parentNode;
              _status.event.dialog.buttons = ui.create.buttons(list, "characterx", buttons);
              _status.event.dialog.content.insertBefore(buttons, node);
              buttons.addTempClass("start");
              node.remove();
              game.uncheck();
              game.check();
            });
            delete _status.createControl;
          };
          if (lib.onfree) {
            lib.onfree.push(function () {
              event.dialogxx = ui.create.characterDialog("heightset");
              if (ui.cheat2) {
                ui.cheat2.addTempClass("controlpressdownx", 500);
                ui.cheat2.classList.remove("disabled");
              }
            });
          } else {
            event.dialogxx = ui.create.characterDialog("heightset");
          }

          ui.create.cheat2 = function () {
            ui.cheat2 = ui.create.control("自由选将", function () {
              if (this.dialog == _status.event.dialog) {
                if (game.changeCoin) {
                  game.changeCoin(10);
                }
                this.dialog.close();
                _status.event.dialog = this.backup;
                this.backup.open();
                delete this.backup;
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.addTempClass("controlpressdownx", 500);
                  ui.cheat.classList.remove("disabled");
                }
              } else {
                if (game.changeCoin) {
                  game.changeCoin(-10);
                }
                this.backup = _status.event.dialog;
                _status.event.dialog.close();
                _status.event.dialog = _status.event.parent.dialogxx;
                this.dialog = _status.event.dialog;
                this.dialog.open();
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.classList.add("disabled");
                }
              }
            });
            if (lib.onfree) {
              ui.cheat2.classList.add("disabled");
            }
          };
          if (!_status.brawl || !_status.brawl.chooseCharacterFixed) {
            if (!ui.cheat && get.config("change_choice")) ui.create.cheat();
            if (!ui.cheat2 && get.config("free_choose")) ui.create.cheat2();
          }
          "step 1";
          if (ui.cheat) {
            ui.cheat.close();
            delete ui.cheat;
          }
          if (ui.cheat2) {
            ui.cheat2.close();
            delete ui.cheat2;
          }
          if (event.chosen.length) {
            event.choosed = event.chosen;
          } else if (event.modchosen) {
            if (event.modchosen[0] == "random") event.modchosen[0] = result.buttons[0].link;
            else event.modchosen[1] = result.buttons[0].link;
            event.choosed = event.modchosen;
          } else if (result.buttons.length == 2) {
            event.choosed = [result.buttons[0].link, result.buttons[1].link];
            game.addRecentCharacter(result.buttons[0].link, result.buttons[1].link);
          } else {
            event.choosed = [result.buttons[0].link];
            game.addRecentCharacter(result.buttons[0].link);
          }
          var name = event.choosed[0];
          /*●*/
          const groups = get.selectGroup(name);
          if (groups?.length) {
            game.me._groupChosen = true;
            const groupResult = game.me.chooseButton(["请选择你的势力", [groups.map((group) => ["", "", `group_${group}`]), "vcard"]], true).set("direct", true).forResult().then(groupResult => {
              if (groupResult.links?.length) event.group = groupResult.links[0][2].slice(6);
            });
          }
          /*if (get.is.double(name)) {
            game.me._groupChosen = true;
            game.me.chooseControl(get.is.double(name, true)).set("prompt", "请选择你的势力");
          } else if (
            lib.character[name].group == "shen" &&
            !lib.character[name].hasHiddenSkill &&
            get.config("choose_group")
          ) {
            var list = lib.group.slice(0);
            list.remove("shen");
            game.me.chooseControl(list).set("prompt", "请选择神武将的势力");
          }*/
          "step 2";
          //event.group = result.control || false;

          if (event.choosed.length == 2) {
            game.me.init(event.choosed[0], event.choosed[1]);
          } else {
            game.me.init(event.choosed[0]);
          }
          event.list.remove(get.sourceCharacter(game.me.name1));
          event.list.remove(get.sourceCharacter(game.me.name2));
          if (!event.stratagemMode && game.me == game.zhu && game.players.length > 4) {
            if (!game.me.isInitFilter("noZhuHp")) {
              game.me.hp++;
              game.me.maxHp++;
              game.me.update();
            }
          }
          for (var i = 0; i < game.players.length; i++) {
            if (
              (event.stratagemMode || game.players[i] != game.zhu) &&
              game.players[i] != game.me
            ) {
              event.list.randomSort();
              event.ai(
                game.players[i],
                event.list.splice(0, get.config("choice_" + game.players[i].identity)),
                null,
                event.list
              );
            }
          }
          "step 3";
          if (event.group) {
            game.me.group = event.group;
            game.me.node.name.dataset.nature = get.groupnature(game.me.group);
            game.me.update();
          }
          for (var i = 0; i < game.players.length; i++) {
            _status.characterlist.remove(game.players[i].name);
            _status.characterlist.remove(game.players[i].name1);
            _status.characterlist.remove(game.players[i].name2);
          }
          "step 4";
          if (event.stratagemMode) {
            ["stratagem_gain", "stratagem_insight", "stratagem_expose"].forEach((globalSkill) =>
              game.addGlobalSkill(globalSkill)
            );
            game.players.forEach((i) => {
              i.storage.zhibi = [];
              i.storage.stratagem_expose = [];
              i.markSkill("stratagem_fury");
            });
          }
          setTimeout(function () {
            ui.arena.classList.remove("choose-character");
          }, 500);

          if (event.special_identity) {
            for (var i = 0; i < event.special_identity.length; i++) {
              game.zhu.addSkill(event.special_identity[i]);
            }
          }
        });
      }
    }
    else if (lib.config.mode == 'doudizhu') {
      game.chooseCharacter = function () {
        if (_status.mode == "kaihei") {
          game.chooseCharacterKaihei();
          return;
        }
        if (_status.mode == "huanle") {
          game.chooseCharacterHuanle();
          return;
        }
        if (_status.mode == "online") {
          game.chooseCharacterZhidou();
          return;
        }
        if (_status.mode == "binglin") {
          game.chooseCharacterBinglin();
          return;
        }
        var next = game.createEvent("chooseCharacter");
        next.showConfig = true;
        next.addPlayer = function (player) {
          var list = get.identityList(game.players.length - 1);
          var list2 = get.identityList(game.players.length);
          for (var i = 0; i < list.length; i++) list2.remove(list[i]);
          player.identity = list2[0];
          player.setIdentity("cai");
        };
        next.removePlayer = function () {
          return game.players.randomGet(game.me, game.zhu);
        };
        next.ai = function (player, list, list2, back) {
          var listc = list.slice(0, 2);
          for (var i = 0; i < listc.length; i++) {
            var listx = lib.characterReplace[listc[i]];
            if (listx && listx.length) listc[i] = listx.randomGet();
          }
          if (get.config("double_character")) {
            player.init(listc[0], listc[1]);
          } else {
            player.init(listc[0]);
          }
          if (player == game.zhu) {
            if (!game.zhu.isInitFilter("noZhuHp")) {
              game.zhu.maxHp++;
              game.zhu.hp++;
              game.zhu.update();
            }
          }
          if (back) {
            list.remove(get.sourceCharacter(player.name1));
            list.remove(get.sourceCharacter(player.name2));
            for (var i = 0; i < list.length; i++) {
              back.push(list[i]);
            }
          }
          if (typeof lib.config.test_game == "string" && player == game.me.next) {
            if (lib.config.test_game != "_")
              player.init(lib.config.test_game);
          }
          player.node.name.dataset.nature = get.groupnature(player.group);
        };
        next.setContent(function () {
          "step 0";
          ui.arena.classList.add("choose-character");
          var i;
          var list;
          var list4 = [];
          var identityList = ["zhu", "fan", "fan"];
          var chosen = lib.config.continue_name || [];
          game.saveConfig("continue_name");
          event.chosen = chosen;

          var addSetting = function (dialog) {
            dialog.add("选择身份").classList.add("add-setting");
            var table = document.createElement("div");
            table.classList.add("add-setting");
            table.style.margin = "0";
            table.style.width = "100%";
            table.style.position = "relative";

            var listi = ["random", "zhu", "fan"];
            for (var i = 0; i < listi.length; i++) {
              var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
              td.link = listi[i];
              if (td.link === game.me.identity) {
                td.classList.add("bluebg");
              }
              table.appendChild(td);
              td.innerHTML = "<span>" + get.translation(listi[i] + "2") + "</span>";
              td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
                if (_status.dragged) return;
                if (_status.justdragged) return;
                _status.tempNoButton = true;
                setTimeout(function () {
                  _status.tempNoButton = false;
                }, 500);
                var link = this.link;
                if (game.zhu.name) {
                  if (link != "random") {
                    _status.event.parent.fixedseat = get.distance(
                      game.me,
                      game.zhu,
                      "absolute"
                    );
                  }
                  game.zhu.uninit();
                  delete game.zhu.isZhu;
                  delete game.zhu.identityShown;
                }
                var current = this.parentNode.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                current = seats.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                if (link == "random") {
                  link = ["zhu", "fan"].randomGet();
                  for (var i = 0; i < this.parentNode.childElementCount; i++) {
                    if (this.parentNode.childNodes[i].link == link) {
                      this.parentNode.childNodes[i].classList.add("bluebg");
                    }
                  }
                } else {
                  this.classList.add("bluebg");
                }
                num = get.config("choice_" + link);
                _status.event.parent.swapnodialog = function (dialog, list) {
                  var buttons = ui.create.div(".buttons");
                  var node = dialog.buttons[0].parentNode;
                  dialog.buttons = ui.create.buttons(list, "characterx", buttons);
                  dialog.content.insertBefore(buttons, node);
                  buttons.addTempClass("start");
                  node.remove();
                  game.uncheck();
                  game.check();
                  for (var i = 0; i < seats.childElementCount; i++) {
                    if (
                      get.distance(game.zhu, game.me, "absolute") ===
                      seats.childNodes[i].link
                    ) {
                      seats.childNodes[i].classList.add("bluebg");
                    }
                  }
                };
                _status.event = _status.event.parent;
                _status.event.step = 0;
                _status.event.identity = link;
                if (link != (event.zhongmode ? "mingzhong" : "zhu")) {
                  seats.previousSibling.style.display = "";
                  seats.style.display = "";
                } else {
                  seats.previousSibling.style.display = "none";
                  seats.style.display = "none";
                }
                game.resume();
              });
            }
            dialog.content.appendChild(table);

            dialog.add("选择座位").classList.add("add-setting");
            var seats = document.createElement("div");
            seats.classList.add("add-setting");
            seats.style.margin = "0";
            seats.style.width = "100%";
            seats.style.position = "relative";
            for (var i = 2; i <= game.players.length; i++) {
              var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
              td.innerHTML = get.cnNumber(i, true);
              td.link = i - 1;
              seats.appendChild(td);
              if (get.distance(game.zhu, game.me, "absolute") === i - 1) {
                td.classList.add("bluebg");
              }
              td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
                if (_status.dragged) return;
                if (_status.justdragged) return;
                if (get.distance(game.zhu, game.me, "absolute") == this.link) return;
                var current = this.parentNode.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                this.classList.add("bluebg");
                for (var i = 0; i < game.players.length; i++) {
                  if (get.distance(game.players[i], game.me, "absolute") == this.link) {
                    game.swapSeat(game.zhu, game.players[i], false);
                    return;
                  }
                }
              });
            }
            dialog.content.appendChild(seats);
            if (game.me == game.zhu) {
              seats.previousSibling.style.display = "none";
              seats.style.display = "none";
            }

            dialog.add(ui.create.div(".placeholder.add-setting"));
            dialog.add(ui.create.div(".placeholder.add-setting"));
            if (get.is.phoneLayout()) dialog.add(ui.create.div(".placeholder.add-setting"));
          };
          var removeSetting = function () {
            var dialog = _status.event.dialog;
            if (dialog) {
              dialog.style.height = "";
              delete dialog._scrollset;
              var list = Array.from(dialog.querySelectorAll(".add-setting"));
              while (list.length) {
                list.shift().remove();
              }
              ui.update();
            }
          };
          event.addSetting = addSetting;
          event.removeSetting = removeSetting;
          event.list = [];
          identityList.randomSort();
          if (event.identity) {
            identityList.remove(event.identity);
            identityList.unshift(event.identity);
            if (event.fixedseat) {
              var zhuIdentity = "zhu";
              if (zhuIdentity != event.identity) {
                identityList.remove(zhuIdentity);
                identityList.splice(event.fixedseat, 0, zhuIdentity);
              }
              delete event.fixedseat;
            }
            delete event.identity;
          }
          for (i = 0; i < game.players.length; i++) {
            game.players[i].identity = identityList[i];
            game.players[i].showIdentity();
            if (identityList[i] == "zhu") {
              game.zhu = game.players[i];
            }
          }

          if (!game.zhu) game.zhu = game.me;
          else {
            game.zhu.setIdentity();
            game.zhu.identityShown = true;
            game.zhu.isZhu = game.zhu.identity == "zhu";
            game.zhu.node.identity.classList.remove("guessing");
            game.me.setIdentity();
            game.me.node.identity.classList.remove("guessing");
          }
          //选将框分配
          for (i in lib.characterReplace) {
            var ix = lib.characterReplace[i];
            for (var j = 0; j < ix.length; j++) {
              if (chosen.includes(ix[j]) || lib.filter.characterDisabled(ix[j]))
                ix.splice(j--, 1);
            }
            if (ix.length) {
              event.list.push(i);
              list4.addArray(ix);
            }
          }
          for (i in lib.character) {
            if (chosen.includes(i) || list4.includes(i)) continue;
            if (lib.filter.characterDisabled(i)) continue;
            event.list.push(i);
            list4.push(i);
          }
          event.list.randomSort();
          _status.characterlist = list4.slice(0);
          var num = get.config("choice_" + game.me.identity);
          list = event.list.slice(0, num);
          delete event.swapnochoose;
          var dialog;
          if (event.swapnodialog) {
            dialog = ui.dialog;
            event.swapnodialog(dialog, list);
            delete event.swapnodialog;
          } else {
            var str = "选择角色";
            if (_status.brawl && _status.brawl.chooseCharacterStr) {
              str = _status.brawl.chooseCharacterStr;
            }
            dialog = ui.create.dialog(str, "hidden", [list, "characterx"]);
            if (!_status.brawl || !_status.brawl.noAddSetting) {
              if (get.config("change_identity")) {
                addSetting(dialog);
              }
            }
          }
          dialog.setCaption("选择角色");
          game.me.setIdentity();

          if (!event.chosen.length) {
            game.me.chooseButton(dialog, true).set("onfree", true).selectButton = function () {
              return get.config("double_character") ? 2 : 1;
            };
            //修改>斗地主
            let requireNum = (function () {
              if (_status.brawl && _status.brawl.doubleCharacter) return 2;
              return get.config("double_character") ? 2 : 1;
            })();
            dzxy.chooseChar_doudizhu.openPage(dialog, requireNum);
            dzxy.chooseChar_doudizhu.updateLayout();
            //修改<
          } else {
            lib.init.onfree();
          }
          ui.create.cheat = function () {
            _status.createControl = ui.cheat2;
            ui.cheat = ui.create.control("更换", function () {
              if (ui.cheat2 && ui.cheat2.dialog == _status.event.dialog) {
                return;
              }
              if (game.changeCoin) {
                game.changeCoin(-3);
              }

              event.list.randomSort();
              list = event.list.slice(0, num);

              var buttons = ui.create.div(".buttons");
              var node = _status.event.dialog.buttons[0].parentNode;
              _status.event.dialog.buttons = ui.create.buttons(list, "characterx", buttons);
              _status.event.dialog.content.insertBefore(buttons, node);
              buttons.addTempClass("start");
              node.remove();
              game.uncheck();
              game.check();
            });
            delete _status.createControl;
          };
          if (lib.onfree) {
            lib.onfree.push(function () {
              event.dialogxx = ui.create.characterDialog("heightset");
              if (ui.cheat2) {
                ui.cheat2.addTempClass("controlpressdownx", 500);
                ui.cheat2.classList.remove("disabled");
              }
            });
          } else {
            event.dialogxx = ui.create.characterDialog("heightset");
          }

          ui.create.cheat2 = function () {
            ui.cheat2 = ui.create.control("自由选将", function () {
              if (this.dialog == _status.event.dialog) {
                if (game.changeCoin) {
                  game.changeCoin(10);
                }
                this.dialog.close();
                _status.event.dialog = this.backup;
                this.backup.open();
                delete this.backup;
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.addTempClass("controlpressdownx", 500);
                  ui.cheat.classList.remove("disabled");
                }
              } else {
                if (game.changeCoin) {
                  game.changeCoin(-10);
                }
                this.backup = _status.event.dialog;
                _status.event.dialog.close();
                _status.event.dialog = _status.event.parent.dialogxx;
                this.dialog = _status.event.dialog;
                this.dialog.open();
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.classList.add("disabled");
                }
              }
            });
            if (lib.onfree) {
              ui.cheat2.classList.add("disabled");
            }
          };
          if (!_status.brawl || !_status.brawl.chooseCharacterFixed) {
            if (!ui.cheat && get.config("change_choice")) ui.create.cheat();
            if (!ui.cheat2 && get.config("free_choose")) ui.create.cheat2();
          }
          "step 1";
          if (ui.cheat) {
            ui.cheat.close();
            delete ui.cheat;
          }
          if (ui.cheat2) {
            ui.cheat2.close();
            delete ui.cheat2;
          }
          var chooseGroup = false;
          if (event.chosen.length) {
            if (lib.character[event.chosen[0]][1] == "shen") {
              chooseGroup = true;
            }
          } else if (event.modchosen) {
            if (event.modchosen[0] == "random") event.modchosen[0] = result.buttons[0].link;
            else event.modchosen[1] = result.buttons[0].link;
          } else if (result.buttons.length == 2) {
            event.choosed = [result.buttons[0].link, result.buttons[1].link];
            game.addRecentCharacter(result.buttons[0].link, result.buttons[1].link);
            if (lib.character[event.choosed[0]][1] == "shen") {
              chooseGroup = true;
            }
          } else {
            event.choosed = [result.buttons[0].link];
            if (lib.character[event.choosed[0]][1] == "shen") {
              chooseGroup = true;
            }
            game.addRecentCharacter(result.buttons[0].link);
          }
          "step 2";
          if (event.chosen.length) {
            game.me.init(event.chosen[0], event.chosen[1]);
          } else if (event.modchosen) {
            game.me.init(event.modchosen[0], event.modchosen[1]);
          } else if (event.choosed.length == 2) {
            game.me.init(event.choosed[0], event.choosed[1]);
          } else {
            game.me.init(event.choosed[0]);
          }
          event.list.remove(get.sourceCharacter(game.me.name1));
          event.list.remove(get.sourceCharacter(game.me.name2));
          if (game.me == game.zhu) {
            if (!game.me.isInitFilter("noZhuHp")) {
              game.me.hp++;
              game.me.maxHp++;
              game.me.update();
            }
          }

          for (var i = 0; i < game.players.length; i++) {
            if (game.players[i] != game.me) {
              event.list.randomSort();
              event.ai(
                game.players[i],
                event.list.splice(0, get.config("choice_" + game.players[i].identity)),
                null,
                event.list
              );
            }
          }
          "step 3";
          for (var i = 0; i < game.players.length; i++) {
            _status.characterlist.remove(game.players[i].name1);
            _status.characterlist.remove(game.players[i].name2);
          }
          setTimeout(function () {
            ui.arena.classList.remove("choose-character");
          }, 500);
        });
      };
      /**1.10.17版代码 */
      game.chooseCharacterHuanle = function () {
        var next = game.createEvent("chooseCharacter");
        next.setContent(function () {
          "step 0";
          ui.arena.classList.add("choose-character");
          game.no_continue_game = true;
          var i;
          event.list = [];
          event.list2 = [];
          var list4 = [];
          if (!event.map) event.map = {};
          for (i in lib.characterReplace) {
            var ix = lib.characterReplace[i];
            for (var j = 0; j < ix.length; j++) {
              if (lib.filter.characterDisabled(ix[j])) ix.splice(j--, 1);
            }
            if (ix.length) {
              var name = ix.randomGet();
              event.list.push(name);
              if (game.recommendDizhu.includes(name)) event.list2.push(name);
              list4.addArray(ix);
            }
          }
          for (i in lib.character) {
            if (list4.includes(i) || lib.filter.characterDisabled(i)) continue;
            event.list.push(i);
            if (game.recommendDizhu.includes(i)) event.list2.push(i);
          }
          event.list.randomSort();
          _status.characterlist = event.list.slice(0);
          event.controls = ["不叫", "一倍", "两倍", "三倍"];//改
          for (var player of game.players) {
            var id = player.playerid;
            if (!event.map[id]) event.map[id] = [];
            event.map[id].addArray(event.list2.randomRemove(1));
            event.list.removeArray(event.map[id]);
            event.map[id].addArray(event.list.randomRemove(4 - event.map[id].length));
            event.list2.removeArray(event.map[id]);
          }
          event.dialog = ui.create.dialog("你的选将框", [event.map[game.me.playerid], "character"]);
          event.start = game.players.randomGet();
          event.current = event.start;
          event.tempZhu = event.start;
          event.beilv = 0;
          lib.init.onfree();
          //修改>
          event.dialog.classList.add('dialog-hide');
          event.getBeilv = (num, no, max = 3) => {
            let list = [];
            for (let i = 0; i <= max; i++) {
              if (no === true && i == 0) list.push(i);
              else if (i > num) list.push(i);
            }
            return list;
          }
          //ai选倍率
          event.AIgetBeilv = (list) => {
            if (list.length == 1) return list[0];
            let mid = Math.floor(list.length / 2);
            let left = list.slice(0, mid);
            let right = list.slice(mid);
            let r = Math.random() < 0.2 ? left.randomGet() : right.randomGet();
            if (dzxy.getCF('aiForcedToRob')) r = list[list.length - 1];
            return r;
          }

          event.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg');
          event.bigBg.addEventListener('touchmove', (e) => {
            e.stopPropagation();
          });
          dzxy.ScreenAdapter.add({
            node: event.bigBg,
            callback: (node, scale) => {
              node.style.zoom = scale;
            }
          });
          event.bigBg.classList.add('show-char');
          event.selChrFrame = new dzxy.SelChrFrame('');
          event.selChrFrame.header.hide();
          event.selChrFrame.setParentNode(event.bigBg);
          event.selChrFrame.ele.style.bottom = 'calc(50% - 50px)';
          event.selChrFrame.ele.style.backgroundColor = '#00000000';

          event.multipleCont = ui.create.div('.dz-sel-multiple-cont', event.bigBg);
          event.multipleCont.hide();

          event.selected = false;
          event.beilvList = [];
          for (let i = 0; i < 4; i++) {
            let beilv = ui.create.div('.ddz-multiple', event.multipleCont);
            beilv.index = i;
            beilv.setBackgroundImage(`${dzxy.path}image/chooseCharacter/happy_fight_time${i}.png`);
            beilv.addEventListener('click', () => {
              if (event.selected) return;
              event.selected = true;
              ui.click.control.call(ui.controls[3 - i].firstChild);
            });
            event.beilvList.push(beilv);
          }

          event.dialog.buttons.forEach(i => {
            let ch = new dzxy.Character2(i.link);
            ch.showframey();
            ch.setParentNode(event.selChrFrame.cont);
          });
          for (let i = 0; i < 3; i++) {
            let ch = ui.create.div('.wujiang-char-base-back', event.selChrFrame.cont)
            ch.pos = ui.create.div('.wujiang-char-base-back2', ch);
            ch.bg = ui.create.div('.wujiang-char-framey', ch.pos);//选
            ch.only = ui.create.div('.happy1v2_empselbg', ch.pos);//选
          }

          event.timebar = new dzxy.Timebar('等', 2000, 2000);
          event.timebar.setParentNode(event.bigBg);
          event.timebar.ele.hide();
          //修改<
          game.delay(2.5);
          "step 1";
          // _status.pauseManager.setDelay(dzxy.delay(5000));
          event.current.chooseControl(event.controls).set("ai", function () {
            if (event.current == event.start) return event.AIgetBeilv(event.getBeilv(event.beilv, false));
            return event.AIgetBeilv(event.getBeilv(event.beilv, true));
          });
          if (event.current == game.me) {
            event.dialog.content.childNodes[0].innerHTML = "是否抢地主？";
            let beilv = event.getBeilv(event.beilv, event.start != game.me);
            for (let i of event.beilvList) {
              if (!beilv.includes(i.index)) i.classList.add('dz-gray', 'dz-noclick');
            }
            event.multipleCont.show();//改
            event.timebar.reset('请选择押注倍数，叫3倍直接成为地主', 50000, 0);
          }
          else {
            event.timebar.reset('正在等待其他人押注', 50000, 0);
            _status.pauseManager.setDelay(dzxy.delay(1500));
          }
          event.timebar.ele.show();

          "step 2";
          if (result.index > event.beilv) event.beilv = result.index;

          if (result.index != 0) {
            event.tempZhu = event.current;
            dzxy.ddzBeilv = event.beilv;
          };
          event.current.chat(result.control);
          if (result.control == "三倍" || event.current == event.start.previous) {
            game.zhu = event.tempZhu;
            for (var player of game.players) {
              player.identity = player == game.zhu ? "zhu" : "fan";
              player.showIdentity();
            }
            event.dialog.close();
            event.map[game.zhu.playerid].addArray(event.list.randomRemove(3));
          } else {
            event.current = event.current.next;
            event.goto(1);
            game.delay(1.5);
          }
          "step 3";
          let cbtn = game.me.chooseButton(["请选择你的武将", [event.map[game.me.playerid], "character"]], true);
          //改
          dzxy.ChooseChar_doudizhu_huanle.updateLayout();
          setTimeout(() => {
            event.bigBg.remove();
            dzxy.ChooseChar_doudizhu_huanle.openPage(cbtn.dialog, 1);
            let free = document.body.querySelector('.dz_game_chr_bg_sg');
            if (free) free.parentNode.remove();
          }, 500);

          "step 4";
          game.me.init(result.links[0]);
          for (var player of game.players) {
            if (player != game.me) player.init(event.map[player.playerid].randomGet());
          }
          if (!game.zhu.isInitFilter("noZhuHp")) {
            game.zhu.maxHp++;
            game.zhu.hp++;
            game.zhu.update();
          }
          for (var i = 0; i < game.players.length; i++) {
            _status.characterlist.remove(game.players[i].name1);
            _status.characterlist.remove(game.players[i].name2);
          }
          setTimeout(function () {
            ui.arena.classList.remove("choose-character");
          }, 500);
        });
      };
    }
    else if (lib.config.mode == 'versus') {
      //修改>
      //2v2看牌
      (function () {
        if (get.config('versus_mode', 'versus') != 'two') return;
        //仅十周年ui手杀样式生效 适配麻烦
        if (!game.hasExtension('十周年UI') || !lib.config[`${dzxy.dz}PWOptimization`] || !lib.config[`${dzxy.dz}chooseChar_versus`]) return;
        let dcf = lib.config['extension_十周年UI_newDecadeStyle'];
        if (dcf != 'off' && dcf != 'othersOn') return;
        // lib.skill._lookCard_updata = {
        //   trigger: {
        //     global: ["gameDrawAfter","dieEnd"],
        //     player: ["gainEnd", "loseEnd","useCardEnd", "respondEnd"],
        //   },
        //   silent: true,
        //   forced: true,
        //   charlotte: true,
        //   content: function () {
        //     let p = player;
        //     if(trigger.name == "die") p=trigger.player;
        //     if (p._cardTipBg) {
        //       let tip = p._cardTipBg;
        //       let str = '';
        //       for (var i = 0; i < p.getCards('h').length; i++) {
        //         if (i <= 3) {
        //           str += get.translation(p.getCards('h')[i].name).slice(0, 2) + '<br>'
        //         }
        //         if (i == 4) {
        //           str += '…';
        //           break;
        //         }
        //       }
        //       tip.innerHTML = str;
        //       if (trigger.name == "die") {
        //         p._cardTipBg.delete();
        //         delete p._cardTipBg;
        //       }
        //     }
        //   },
        // };
        // lib.skill._lookCard_create = {
        //   trigger: {
        //     global: 'gameDrawBefore',
        //     player:['changeSkillsEnd','changeCharacterEnd'],
        //   },
        //   priority: 99,
        //   firstDo: true,
        //   charlotte: true,
        //   forced: true,
        //   filter: function (event, player) {
        //     if(player._cardTipBg) return false;
        //     return player != game.me && player.side == game.me.side;
        //   },
        //   content: function () {
        //     var cardTipBg = ui.create.div('.card_tips_bg', player);
        //     player._cardTipBg = cardTipBg;
        //     cardTipBg.onclick = function () {
        //       if (player.getCards('h').length <= 0) return;
        //       let bigBg = dzxy.create.bigBg(ui.window, false, () => bigBg.remove());
        //       let bg = ui.create.div('.dz-icon-tip.view-card', bigBg);
        //       bg.addEventListener('click', evt => evt.stopPropagation())
        //       ui.create.div('.dz-title', '队友手牌', bg);
        //       let cards = ui.create.div('.view-cards', bg);
        //       dzxy.scroll_lr(cards, 150);
        //       //（牌数-1）*间距+1牌宽=总长
        //       let gap = (440 - 79) / (player.getCards('h').length - 1);
        //       if (gap > 79) gap = 79;
        //       if (gap < 30) gap = 30;
        //       for (let i = 0; i < player.getCards('h').length; i++) {
        //         let card = ui.create.card(cards, 'noclick', true).init(player.getCards('h')[i]);
        //         card.style.left = gap * i + 'px';
        //       };
        //     }
        //   }
        // }

        // let swap = game.swapSeat;
        // game.swapSeat = (...args) => {
        //   swap.apply(this, args);
        //   //补充↓
        //   if (lib.config.mode == 'versus') {
        //     let layoutList = {
        //       '1': 'next',
        //       '3': 'previous',
        //       '2': 'opposite',
        //     }
        //     let playersAll = game.players.slice().addArray(game.dead.slice());
        //     playersAll.sortBySeat(game.me);
        //     for (let i = 1; i < playersAll.length; i++) {
        //       if (playersAll[i].side == game.me.side) {
        //         ui.arena.dataset.layoutTwotwo = layoutList[String(i)];
        //         break;
        //       }
        //     }
        //   }
        // }
      })();

      //修改<
      game.chooseCharacterTwo = function () {
        var next = game.createEvent("chooseCharacter");
        next.showConfig = true;
        next.setContent(function () {
          "step 0";
          ui.arena.classList.add("choose-character");
          // for (var i in lib.skill) {
          // 	if (lib.skill[i].changeSeat) {
          // 		lib.skill[i] = {};
          // 		if (lib.translate[i + "_info"]) {
          // 			lib.translate[i + "_info"] = "此模式下不可用";
          // 		}
          // 	}
          // }
          var bool = Math.random() < 0.5;
          var bool2 = Math.random() < 0.5;
          var ref = game.players[0];

          ref.side = bool;
          ref.next.side = bool2;
          ref.next.next.side = !bool;
          ref.previous.side = !bool2;

          var firstChoose = game.players.randomGet();
          if (firstChoose.next.side == firstChoose.side) {
            firstChoose = firstChoose.next;
          }
          _status.firstAct = firstChoose;
          for (var i = 0; i < 4; i++) {
            firstChoose.node.name.innerHTML = get.verticalStr(get.cnNumber(i + 1, true) + "号位");
            firstChoose = firstChoose.next;
          }

          for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].side == game.me.side) {
              game.players[i].node.identity.firstChild.innerHTML = "友";
            } else {
              game.players[i].node.identity.firstChild.innerHTML = "敌";
            }
            game.players[i].node.identity.dataset.color = game.players[i].side + "zhu";
          }
          //22选将框分配
          var list = [];
          var list4 = [];
          for (i in lib.characterReplace) {
            var ix = lib.characterReplace[i];
            for (var j = 0; j < ix.length; j++) {
              if (lib.filter.characterDisabled(ix[j])) ix.splice(j--, 1);
            }
            if (ix.length) {
              list.push(i);
              list4.addArray(ix);
            }
          }
          for (i in lib.character) {
            if (!list4.includes(i) && !lib.filter.characterDisabled(i)) {
              list.push(i);
              list4.push(i);
            }
          }
          var choose = [];
          event.list = list;
          _status.characterlist = list4;
          //修改>2v2
          function mod22() {

            //仅十周年ui手杀样式生效 适配麻烦
            if (!game.hasExtension('十周年UI') || !lib.config[`${dzxy.dz}PWOptimization`]) return;
            let dcf = lib.config['extension_十周年UI_newDecadeStyle'];

            let friend = game.players.find(i => i != game.me && i.side == game.me.side);
            if (game.me.previous == friend) ui.arena.dataset.layoutTwotwo = 'previous';
            else ui.arena.dataset.layoutTwotwo = 'next';

            if (dcf == 'off' || dcf == 'othersOn') {
              var gone = _status.firstAct;
              var gtwo = _status.firstAct.next;
              var gthree = _status.firstAct.next.next;
              var gfour = _status.firstAct.previous;
              gone.node.identity.setBackgroundImage(`${dzxy.path}image/chooseCharacter/game_figure_dragon.png`);
              ui.create.div('.game_dragon_frame', gone);
              gtwo.node.identity.setBackgroundImage(`${dzxy.path}image/chooseCharacter/game_figure_tiger.png`);
              ui.create.div('.game_tiger_frame', gtwo);
              gthree.node.identity.setBackgroundImage(`${dzxy.path}image/chooseCharacter/game_figure_tiger.png`);
              ui.create.div('.game_tiger_frame', gthree);
              gfour.node.identity.setBackgroundImage(`${dzxy.path}image/chooseCharacter/game_figure_dragon.png`);
              ui.create.div('.game_dragon_frame', gfour);
            }
          }
          mod22();
          //修改<2v2


          var addSetting = function (dialog) {
            dialog.add("选择座位").classList.add("add-setting");
            var seats = document.createElement("table");
            seats.classList.add("add-setting");
            seats.style.margin = "0";
            seats.style.width = "100%";
            seats.style.position = "relative";
            for (var i = 1; i <= game.players.length; i++) {
              var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
              td.innerHTML = get.cnNumber(i, true);
              td.link = i - 1;
              seats.appendChild(td);
              if (get.distance(_status.firstAct, game.me, "absolute") === i - 1) {
                td.classList.add("bluebg");
              }
              td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
                if (_status.dragged) return;
                if (_status.justdragged) return;
                if (get.distance(_status.firstAct, game.me, "absolute") == this.link) return;
                var current = this.parentNode.querySelector(".bluebg");
                if (current) {
                  current.classList.remove("bluebg");
                }
                this.classList.add("bluebg");
                _status.firstAct = game.me;
                for (var i = 0; i < this.link; i++) {
                  _status.firstAct = _status.firstAct.previous;
                }
                var firstChoose = _status.firstAct;
                firstChoose.next.side = !firstChoose.side;
                firstChoose.next.next.side = !firstChoose.side;
                firstChoose.previous.side = firstChoose.side;
                for (var i = 0; i < game.players.length; i++) {
                  if (game.players[i].side == game.me.side) {
                    game.players[i].node.identity.firstChild.innerHTML = "友";
                  } else {
                    game.players[i].node.identity.firstChild.innerHTML = "敌";
                  }
                  game.players[i].node.identity.dataset.color =
                    game.players[i].side + "zhu";
                }
                for (var i = 0; i < 4; i++) {
                  firstChoose.node.name.innerHTML = get.verticalStr(
                    get.cnNumber(i + 1, true) + "号位"
                  );
                  firstChoose = firstChoose.next;
                }

                //修改>2v2
                mod22();
                //修改<2v2
              });
            }
            dialog.content.appendChild(seats);
            if (game.me == game.zhu) {
              seats.previousSibling.style.display = "none";
              seats.style.display = "none";
            }

            dialog.add(ui.create.div(".placeholder.add-setting"));
            dialog.add(ui.create.div(".placeholder.add-setting"));
            if (get.is.phoneLayout()) dialog.add(ui.create.div(".placeholder.add-setting"));
          };
          var removeSetting = function () {
            var dialog = _status.event.dialog;
            if (dialog) {
              dialog.style.height = "";
              delete dialog._scrollset;
              var list = Array.from(dialog.querySelectorAll(".add-setting"));
              while (list.length) {
                list.shift().remove();
              }
              ui.update();
            }
          };
          event.addSetting = addSetting;
          event.removeSetting = removeSetting;

          var characterChoice;
          if (_status.brawl && _status.brawl.chooseCharacter) {
            characterChoice = _status.brawl.chooseCharacter(list, game.me);
          } else {
            characterChoice = list.randomGets(10);
          }
          var basenum = 1;
          var basestr = "选择角色";
          if (get.config("two_assign")) {
            basenum = 2;
            basestr = "选择你和队友的角色";
            event.two_assign = true;
          }
          if (get.config("replace_character_two")) {
            basestr += "（含一名替补角色）";
            _status.replacetwo = true;
            game.additionaldead = [];
            basenum *= 2;
          }
          var dialog = ui.create.dialog(basestr, [characterChoice, "characterx"]);
          game.me.chooseButton(true, dialog, basenum).set("onfree", true);
          if (!_status.brawl || !_status.brawl.noAddSetting) {
            if (get.config("change_identity")) {
              addSetting(dialog);
            }
          }

          ui.create.cheat = function () {
            _status.createControl = ui.cheat2;
            ui.cheat = ui.create.control("更换", function () {
              if (ui.cheat2 && ui.cheat2.dialog == _status.event.dialog) {
                return;
              }
              if (game.changeCoin) {
                game.changeCoin(-3);
              }
              var buttons = ui.create.div(".buttons");
              var node = _status.event.dialog.buttons[0].parentNode;
              _status.event.dialog.buttons = ui.create.buttons(
                list.randomGets(7),
                "characterx",
                buttons
              );
              _status.event.dialog.content.insertBefore(buttons, node);
              buttons.addTempClass("start");
              node.remove();
              game.uncheck();
              game.check();
            });
            delete _status.createControl;
          };
          if (lib.onfree) {
            lib.onfree.push(function () {
              event.dialogxx = ui.create.characterDialog("heightset");
              if (ui.cheat2) {
                ui.cheat2.addTempClass("controlpressdownx", 500);
                ui.cheat2.classList.remove("disabled");
              }
            });
          } else {
            event.dialogxx = ui.create.characterDialog("heightset");
          }
          ui.create.cheat2 = function () {
            ui.cheat2 = ui.create.control("自由选将", function () {
              if (this.dialog == _status.event.dialog) {
                if (game.changeCoin) {
                  game.changeCoin(10);
                }
                this.dialog.close();
                _status.event.dialog = this.backup;
                this.backup.open();
                delete this.backup;
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.addTempClass("controlpressdownx", 500);
                  ui.cheat.classList.remove("disabled");
                }
              } else {
                if (game.changeCoin) {
                  game.changeCoin(-10);
                }
                this.backup = _status.event.dialog;
                _status.event.dialog.close();
                _status.event.dialog = _status.event.parent.dialogxx;
                this.dialog = _status.event.dialog;
                this.dialog.open();
                game.uncheck();
                game.check();
                if (ui.cheat) {
                  ui.cheat.classList.add("disabled");
                }
              }
            });
            ui.cheat2.classList.add("disabled");
          };
          if (!_status.brawl || !_status.brawl.chooseCharacterFixed) {
            if (!ui.cheat && get.config("change_choice")) {
              ui.create.cheat();
            }
            if (!ui.cheat2 && get.config("free_choose")) {
              ui.create.cheat2();
            }
          }
          //修改>2v2
          dzxy.chooseChar_versus.openPage(dialog, basenum);
          //修改<
          "step 1";
          if (ui.cheat) {
            ui.cheat.close();
            delete ui.cheat;
          }
          if (ui.cheat2) {
            ui.cheat2.close();
            delete ui.cheat2;
          }
          for (var i = 0; i < result.links.length; i++) {
            game.addRecentCharacter(result.links[i]);
          }
          game.me.init(result.links[0]);
          if (_status.replacetwo) {
            game.me.replacetwo = result.links[1];
          }
          event.list.remove(game.me.name1);
          for (var i = 0; i < game.players.length; i++) {
            if (game.players[i] != game.me) {
              if (_status.brawl && _status.brawl.chooseCharacter) {
                var list = _status.brawl.chooseCharacter(event.list, game.players[i]);
                game.players[i].init(list.randomGet());
                event.list.remove(game.players[i].name1);
                if (_status.replacetwo) {
                  game.players[i].replacetwo = list.randomGet(game.players[i].name1);
                  event.list.remove(game.players[i].replacetwo);
                }
              } else {
                if (event.two_assign && game.players[i].side == game.me.side) {
                  if (_status.replacetwo) {
                    game.players[i].init(result.links[2]);
                    game.players[i].replacetwo = result.links[3];
                  } else {
                    game.players[i].init(result.links[1]);
                  }
                } else {
                  var name = event.list.randomRemove();
                  if (lib.characterReplace[name] && lib.characterReplace[name].length)
                    name = lib.characterReplace[name].randomGet();
                  game.players[i].init(name);
                  if (_status.replacetwo) {
                    var name2 = event.list.randomRemove();
                    if (lib.characterReplace[name2] && lib.characterReplace[name2].length)
                      name2 = lib.characterReplace[name2].randomGet();
                    game.players[i].replacetwo = name2;
                  }
                }
              }
            }
          }
          for (var i = 0; i < game.players.length; i++) {
            _status.characterlist.remove(game.players[i].name1);
            _status.characterlist.remove(game.players[i].replacetwo);
          }
          setTimeout(function () {
            ui.arena.classList.remove("choose-character");
          }, 500);
          if (get.config("olfeiyang_four")) {
            var target = _status.firstAct.previous;
            if (target.isIn()) target.addSkill("olfeiyang");
          }
          game.addGlobalSkill("versus_viewHandcard");
          if (get.config("two_phaseswap")) {
            game.addGlobalSkill("autoswap");
            if (lib.config.show_handcardbutton) {
              ui.versushs = ui.create.system("手牌", null, true);
              lib.setPopped(ui.versushs, game.versusHoverHandcards, 220);
            }
          }
        });
      };
    }
  }
}
