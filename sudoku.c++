#include <bits/stdc++.h>
using namespace std;

const long long mod = 1e9+7;

bool ro[10][10], co[10][10], box[10][10];
char s[10][10];
int ans[10][10];
vector<pair<int,int>> pos; 
bool ok = 0;

void fill(int id) {
   if(id == pos.size()) {
      if(ok == 1) return;
      ok = 1;
      cout <<  "YES\n";
      for(int i = 0;i <= 8; ++i) {
         for(int j = 0;j <= 8; ++j) cout << s[i][j];
         cout << "\n";
      }
   }
   
   int i = pos[id].first;
   int j = pos[id].second;
   
   for(int x = 1;x <= 9; ++x) {
      if(ro[i][x] == 1) continue;
      if(co[j][x] == 1) continue;
      int f = (i/3)*3 + j/3;
      if(box[f][x] == 1) continue;
      if(ok) return;
      char c = (char)('0' + x);
      s[i][j] = c;
      ro[i][x] = 1;
      co[j][x] = 1;
      box[f][x] = 1;
      fill(id+1);
      ro[i][x] = 0;
      co[j][x] = 0;
      box[f][x] = 0;
   }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

   bool check = true;
   for(int i = 0;i <= 8; ++i) {
      for(int j = 0;j <= 8; ++j) {
         cin >> s[i][j];
         int x = s[i][j] -'0';
         if(s[i][j] == '.') {
            pos.push_back({i,j});
         }
         else {
            int f = (i/3)*3 + j/3;
            if(ro[i][x] == 1 || co[j][x] == 1 || box[f][x] == 1) check = false;
            
            ro[i][x] = 1;
            co[j][x] = 1;
            box[f][x] = 1;
         }
      }
   }
   
   if(check == false) {
      cout << "NO\n";
   }
   else {
      int n = pos.size();
      fill(0);
      if(!ok) cout << "NO\n";
   }

    return 0;
}