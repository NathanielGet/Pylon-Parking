#include <eosio/eosio.hpp>
#include <eosio/print.hpp>
#include <eosio/system.hpp>
#include <eosio/asset.hpp>
#include <vector>

using namespace eosio;

class [[eosio::contract("parkingspot")]] parkingspot : public eosio::contract {
private:
  const symbol hokie_coin;

  struct [[eosio::table]] balance
  {
    eosio::asset funds;
    uint64_t primary_key() const { return funds.symbol.raw(); }
  };

  using balance_table = eosio::multi_index<"balance"_n, balance>;

  uint32_t now() {
    return current_time_point().sec_since_epoch();
  }

  //Time to expire is now() + 1 hour
  uint32_t start = now();
  const uint32_t trans_expire = start + 3600;

  //Parking spot to store the info
  struct [[eosio::table]] pspot {
    uint64_t spot_id; //key
    uint64_t zone_id;
    std::vector<uint32_t>  timeclock; //Time information in 15 min intervals
    bool available;
    name owner;

    //Sets primary key to be the spot id
    uint64_t primary_key() const {return spot_id;}
  };

  void send_summary(name user, std::string message) {
    /*
    * Permision level = authorized is the active authority of the contract
    * Code = account where contract is deployed
    * Action we want to perform
    * Data to pass to the action
    */
    action (
      permission_level{get_self(),"active"_n},
      get_self(),
      "notify"_n,
      std::make_tuple(user, name{user}.to_string() + message)
    ).send();
  };

  /*_n is the name of the table
  * takes in a pspot value
  */
  typedef eosio::multi_index<"pspots"_n, pspot> park_index;

public:
 //"code" param is the account the contract is deployed to
 //Will only accept hokie coin of type VTP with 4 decimal places
  parkingspot(name receiver, name code, datastream<const char*> ds):contract(receiver, code, ds),hokie_coin("VTP", 4){}
  
  [[eosio::action]]
  void notify(name user, std::string msg) {
    //Only authorization is the contract itself
    require_auth(get_self());
    //Ensures the accounts receive the notificaiton of the action being executed (carbon copy)
    require_recipient(user);
  }

  //Inserts new parking spot
  [[eosio::action]] //Needed for ABI generation
  void insert(name user, uint64_t spot_id, uint64_t zone_id, uint32_t time_code, name owner) {
      //Ensures the account executing transaction has proper permissions
      require_auth(user);

      /* Creates Table to index from
      *  first param specifies the owner of this table
      *     in this case the name of the contract
      *  second param is the scope and ensures uniqueness of the table within the contract
      *     in this case the account name this contract is deployed to
      */
      park_index parkdeck(get_self(), get_first_receiver().value);

      //Iterator for parking spots using spot_id as key
      auto iterator = parkdeck.find(spot_id);

      if( iterator == parkdeck.end() ) {
            //The parking spot isn't in the table
            parkdeck.emplace(user, [&](auto& row) {
                row.spot_id = spot_id;
                row.zone_id = zone_id;
                row.available = true;
                row.owner = owner;//Should be VT by default
            });
            print("Parking Spot: ", spot_id, " in Zone: ", zone_id, " is created on: ", current_time_point().sec_since_epoch());
            send_summary(user, " successfully inserted parking spot");
        }
        else {
            //The parking spot is in the table
            print("ALREADY EXISTS! Parking Spot: ", spot_id, " in Zone: ", zone_id);
        }
  }

  //Erases parking spot 
  //TODO Change only to admin access
  [[eosio::action]]
  void erase(name user, uint64_t spot_id, uint64_t zone_id) {
    require_auth(user);

    park_index parkdeck(get_self(), get_first_receiver().value);

    //Iterator for parking spots using spot_id as key
    auto iterator = parkdeck.find(spot_id);

    if( iterator == parkdeck.end() ) {
          //The parking spot isn't in the table
          //    check(iterator != addresses.end(), "Record does not exist");
          print("DOES NOT EXIST! Parking Spot: ", spot_id, " in Zone: ", zone_id);
      }
      else {
          parkdeck.erase(iterator);
          print("REMOVED Parking Spot: ", spot_id, " in Zone: ", zone_id, " on: ", current_time_point().sec_since_epoch());
          send_summary(user, " successfully removed parking spot");

      }
    
  }

  //Updates parking spot available
  [[eosio::action]]
  // [[eosio::on_notify("eosio.token::transfer")]]
  void modavail(name user, eosio::asset quantity, uint64_t spot_id, uint64_t zone_id, uint32_t time_code, name buyer, name seller) {
    //Ensure not transferring to self
    // if (owner == get_self() || user != get_self()) {
    //   return;
    // }
      //Ensures the account executing transaction has proper permissions
      require_auth(user);

      //The transaction didn't take an hour
      check(now() < trans_expire, "Transfer time expired");
      
      //The incoming transfer has a valid amount of tokens
      check(quantity.amount > 0, "Invalid Amount");

      //The incoming transfer uses the token we specify in the constructor
      //print(quantity.symbol, " ", hodl_symbol);
      check(quantity.symbol == hokie_coin, "Incorrect Currency Type");


      /* Creates Table to index from
      *  first param specifies the owner of this table
      *     in this case the name of the contract
      *  second param is the scope and ensures uniqueness of the table within the contract
      *     in this case the account name this contract is deployed to
      */
      park_index parkdeck(get_self(), get_first_receiver().value);

      //Iterator for parking spots using spot_id as key
      auto iterator = parkdeck.find(spot_id);

      if( iterator == parkdeck.end() ) {
            //The parking spot isn't in the table
            //    check(iterator != addresses.end(), "Record does not exist");
            print("DOES NOT EXIST! Parking Spot: ", spot_id, " in Zone: ", zone_id);
        }
        else {
          //require_auth(buyer);
          action transferSeller = action(
            permission_level{buyer,"active"_n},
            "eosio.token"_n,
            "transfer"_n,
            std::make_tuple(buyer, seller, quantity, std::string("payment from buyer"))
          );
          transferSeller.send();
            //Get money from user
            // balance_table balanceBuy(get_self(), buyer.value);
            // auto bal_it_buy = balanceBuy.find(hokie_coin.raw());

            // if (bal_it_buy != balanceBuy.end()) {
            //   //Subtract from exisiting money
            //   balanceBuy.modify(bal_it_buy, get_self(), [&](auto &row) {
            //     if(row.funds < quantity) {
            //       print("Insufficient Funds From Buyer");
            //       return;
            //     }
            //     row.funds -= quantity;
            //   });
            // }
            // else {
            //     print("No Account Found for Buyer - Creating Account");
            //     balanceBuy.emplace(get_self(), [&](auto &row) {
            //       eosio::asset x(0, hokie_coin);
            //       row.funds = x;
            //     });
            //     return;
            //   }

            // //Transfer money to old owner
            // balance_table balanceSell(get_self(), seller.value);
            // auto bal_it_sell = balanceSell.find(hokie_coin.raw());

            // if (bal_it_sell != balanceSell.end()) {
            //   //Add to exisiting money
            //   balanceSell.modify(bal_it_sell, get_self(), [&](auto &row) {
            //     row.funds += quantity;
            //   });
            // }
            // else {
            //   //Give new money
            //   balanceSell.emplace(get_self(), [&](auto &row) {
            //     row.funds = quantity;
            //   });
            // }

            parkdeck.modify(iterator, user, [&](auto& row) {
                bool found = false;
                for (auto it = begin (row.timeclock); it != end (row.timeclock); ++it) {
                      if(*it == time_code) {
                        found = true;
                      }
                  }
                if(!found) {
                  row.timeclock.push_back(time_code);
                }
                //require_auth(row.owner);
                //end_summary(row.owner, " transferring ownership");
                row.available = false;
                row.owner = buyer;
            });

            print("Parking Spot: ", spot_id, " in Zone: ", zone_id, " is owned by ", buyer, " for: ", time_code, ". Transaction on ", current_time_point().sec_since_epoch());
            send_summary(user, " successfully changed parking spot availability");
        }
  }
};